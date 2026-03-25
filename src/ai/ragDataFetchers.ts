import axios from 'axios';
import * as cheerio from 'cheerio';
import { ensureDOMMatrix } from '../core/envGuard';

// Apply polyfill before requiring browser-dependent libraries
ensureDOMMatrix();

const pdf = require('pdf-parse');
import * as fs from 'fs';
import logger from '../core/logger';

export interface RagDocument {
  source: string;
  type: 'github' | 'web' | 'pdf' | 'wikipedia' | 'stackoverflow';
  content: string;
  metadata: Record<string, any>;
}

export class RagDataFetchers {
  /**
   * Fetches content from a GitHub repository (Recursive code and docs).
   */
  public async fetchGitHub(owner: string, repo: string, path: string = ''): Promise<RagDocument[]> {
    logger.info('RagFetchers', `Fetching GitHub repo: ${owner}/${repo} (path: ${path})`);
    const docs: RagDocument[] = [];
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    // Common code and doc extensions
    const allowedExtensions = [
      '.ts', '.tsx', '.js', '.jsx', '.py', '.c', 'cpp', '.h', '.hpp', '.go', '.rs', '.java', 
      '.html', '.css', '.json', '.md', '.txt', '.py', '.sh', '.yaml', '.yml', '.sql'
    ];
    
    // Blacklisted directories
    const blacklistedDirs = [
      'node_modules', '.git', 'dist', 'build', 'vendor', 'target', 'bin', 'obj', '.github',
      '.vscode', '__pycache__', 'venv', 'env'
    ];

    try {
      logger.info('RagFetchers', `Calling GitHub API: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'SyntraLocalAI/1.0'
        }
      });
      
      const items = Array.isArray(response.data) ? response.data : [response.data];
      logger.info('RagFetchers', `GitHub API responded with ${items.length} items.`);

      for (const item of items) {
        if (item.type === 'file') {
          const extension = '.' + item.name.split('.').pop();
          if (allowedExtensions.includes(extension) || allowedExtensions.includes(item.name)) {
            logger.info('RagFetchers', `Reading GitHub file: ${item.path}`);
            try {
              const fileContent = await axios.get(item.download_url);
              docs.push({
                source: item.html_url,
                type: 'github',
                content: typeof fileContent.data === 'string' ? fileContent.data : JSON.stringify(fileContent.data, null, 2),
                metadata: { owner, repo, filename: item.name, path: item.path }
              });
            } catch (fileErr) {
              logger.error('RagFetchers', `Failed to download file ${item.path}: ${fileErr}`);
            }
          }
        } else if (item.type === 'dir' && !blacklistedDirs.includes(item.name)) {
          logger.info('RagFetchers', `Recursing into GitHub dir: ${item.path}`);
          const subDocs = await this.fetchGitHub(owner, repo, item.path);
          docs.push(...subDocs);
        }
      }
    } catch (err: any) {
      logger.error('RagFetchers', `Error fetching GitHub ${owner}/${repo}: ${err.message} (URL: ${url})`);
    }
    return docs;
  }

  /**
   * Fetches and cleans content from a web page.
   */
  public async fetchWeb(url: string): Promise<RagDocument | null> {
    logger.info('RagFetchers', `Fetching Web page: ${url}`);
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      // Remove noise
      $('script, style, nav, footer, header, aside').remove();
      
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

      return {
        source: url,
        type: 'web',
        content: bodyText,
        metadata: { title: $('title').text() }
      };
    } catch (err: any) {
      logger.error('RagFetchers', `Error fetching Web: ${err.message}`);
      return null;
    }
  }

  /**
   * Extracts text from a local PDF file.
   */
  public async fetchPDF(filePath: string): Promise<RagDocument | null> {
    const normalizedPath = filePath.replace(/^"|"$/g, '').trim();
    logger.info('RagFetchers', `Parsing PDF: ${normalizedPath}`);
    try {
      if (!fs.existsSync(normalizedPath)) {
        throw new Error(`Arquivo não encontrado: ${normalizedPath}`);
      }

      const dataBuffer = fs.readFileSync(normalizedPath);
      const data = await pdf(dataBuffer);

      if (!data || !data.text || data.text.trim().length === 0) {
        throw new Error('O PDF parece estar vazio ou não contém texto extraível (pode ser uma imagem/scanner).');
      }

      return {
        source: normalizedPath,
        type: 'pdf',
        content: data.text,
        metadata: { 
          author: data.info?.Author, 
          title: data.info?.Title,
          pages: data.numpages
        }
      };
    } catch (err: any) {
      logger.error('RagFetchers', `Error parsing PDF: ${err.message}`);
      throw err; // Re-throw to show in UI
    }
  }

  /**
   * Reads content from a local text/code file.
   */
  public async fetchLocalFile(filePath: string): Promise<RagDocument | null> {
    const normalizedPath = filePath.replace(/^"|"$/g, '').trim();
    logger.info('RagFetchers', `Reading local file: ${normalizedPath}`);
    try {
      if (!fs.existsSync(normalizedPath)) {
        throw new Error(`Arquivo não encontrado: ${normalizedPath}`);
      }

      const content = fs.readFileSync(normalizedPath, 'utf-8');
      const ext = normalizedPath.split('.').pop() || '';

      return {
        source: normalizedPath,
        type: 'web', // Reuse web type for generic text docs
        content: content,
        metadata: { 
          filename: normalizedPath.split(/[/\\]/).pop(),
          path: normalizedPath,
          extension: ext
        }
      };
    } catch (err: any) {
      logger.error('RagFetchers', `Error reading local file: ${err.message}`);
      return null;
    }
  }
  public async fetchWikipedia(input: string, lang: string = 'pt'): Promise<RagDocument | null> {
    let query = input;
    let titleToFetch = '';

    // Handle full Wikipedia URLs
    if (input.includes('wikipedia.org/wiki/')) {
        const langMatch = input.match(/https?:\/\/([^.]+)\.wikipedia\.org/);
        const urlParts = input.split('/wiki/');
        if (langMatch) lang = langMatch[1];
        
        if (urlParts.length > 1) {
            titleToFetch = decodeURIComponent(urlParts[1].split(/[?#]/)[0]).replace(/_/g, ' ');
            logger.info('RagFetchers', `Extracted Wikipedia title: ${titleToFetch} (lang: ${lang})`);
        }
    } else {
        query = input;
    }

    logger.info('RagFetchers', `Fetching Wikipedia: ${query} (${lang})`);
    
    try {
      if (!titleToFetch) {
        // 1. Search for the best matching page using Action API
        const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
        logger.info('RagFetchers', `Searching Wikipedia (Action API): ${searchUrl}`);
        
        const searchRes = await axios.get(searchUrl, {
          headers: { 'User-Agent': 'SyntraLocalAI/1.0' }
        });
  
        if (!searchRes.data || !searchRes.data.query || !searchRes.data.query.search || searchRes.data.query.search.length === 0) {
          logger.warn('RagFetchers', `No Wikipedia results found for: ${query}`);
          return null;
        }
  
        const bestMatch = searchRes.data.query.search[0];
        titleToFetch = bestMatch.title;
        logger.info('RagFetchers', `Best Wikipedia match found: ${titleToFetch}`);
      }

      // 2. Fetch the summary for the specific title
      const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titleToFetch.replace(/\s/g, '_'))}`;
      logger.info('RagFetchers', `Fetching Wikipedia summary: ${summaryUrl}`);
      
      const response = await axios.get(summaryUrl, {
        headers: { 'User-Agent': 'SyntraLocalAI/1.0' }
      });
      
      if (!response.data || !response.data.extract) {
        return null;
      }

      return {
        source: response.data.content_urls.desktop.page,
        type: 'wikipedia',
        content: response.data.extract,
        metadata: { 
          title: response.data.title,
          description: response.data.description,
          thumbnail: response.data.thumbnail?.source
        }
      };
    } catch (err: any) {
      if (err.response && err.response.status === 404) {
        logger.warn('RagFetchers', `Wikipedia 404 (Not Found): ${query}`);
      } else {
        logger.error('RagFetchers', `Error fetching Wikipedia for "${query}": ${err.message}`);
      }
      return null;
    }
  }

  /**
   * Fetches content from Stack Overflow using Stack Exchange API.
   */
  public async fetchStackOverflow(query: string): Promise<RagDocument[]> {
    logger.info('RagFetchers', `Fetching Stack Overflow: ${query}`);
    const encodedQuery = encodeURIComponent(query);
    // Filter !nNPvMnZ-R7 includes question and answer bodies
    const url = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodedQuery}&site=stackoverflow&filter=withbody`;
    
    let retries = 0;
    while (retries < 2) {
      try {
        logger.info('RagFetchers', `Calling StackOverflow API [Attempt ${retries + 1}]: ${url}`);
        const response = await axios.get(url);
        
        if (!response.data || !response.data.items) {
          logger.error('RagFetchers', `StackOverflow API invalid response structure: ${JSON.stringify(response.data)}`);
          return [];
        }

        const items = response.data.items;
        logger.info('RagFetchers', `StackOverflow API responded with ${items.length} items.`);

        if (items.length === 0) {
          logger.warn('RagFetchers', `No items found for query: ${query}`);
          return [];
        }

        const docs: RagDocument[] = [];
        for (const item of items.slice(0, 5)) { // Increase to top 5 for better knowledge base
          // Decode HTML entities in title
          const decodedTitle = item.title
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');

          let content = `Question: ${decodedTitle}\n\n${item.body_markdown || item.body}\n\n`;
          
          if (item.answers) {
            content += `Top Answers:\n`;
            for (const answer of item.answers.slice(0, 2)) {
              content += `--- Answer ---\n${answer.body_markdown || answer.body}\n\n`;
            }
          }
 
          docs.push({
            source: item.link,
            type: 'stackoverflow',
            content: content,
            metadata: { 
              title: decodedTitle,
              tags: item.tags,
              score: item.score
            }
          });
        }
        return docs;

      } catch (err: any) {
        retries++;
        logger.error('RagFetchers', `Error fetching Stack Overflow (Attempt ${retries}): ${err.message} (URL: ${url})`);
        if (retries >= 2) return [];
        await new Promise(r => setTimeout(r, 1000)); // Wait before retry
      }
    }
    return [];
  }
  public extractKeywords(text: string): string[] {
    // Basic keyword extraction based on frequency and technical patterns
    const words = text.toLowerCase()
      .replace(/[^a-z0-9+#.\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !this.isStopWord(w));

    const freq: Record<string, number> = {};
    words.forEach(w => freq[w] = (freq[w] || 0) + 1);

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  public extractTags(documents: RagDocument[]): string[] {
    const tags = new Set<string>();
    documents.forEach(doc => {
      if (doc.metadata && doc.metadata.tags && Array.isArray(doc.metadata.tags)) {
        doc.metadata.tags.forEach((t: string) => tags.add(t.toLowerCase()));
      }
    });
    return Array.from(tags);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set(['this', 'that', 'with', 'from', 'your', 'have', 'been', 'which', 'where', 'when', 'what', 'some', 'they', 'them', 'these', 'those', 'there', 'their', 'only', 'very', 'just', 'more', 'than', 'could', 'should', 'would', 'about', 'above', 'after', 'again', 'against', 'also', 'anybody', 'anyone', 'anything', 'anywhere', 'around', 'back', 'became', 'because', 'become', 'becomes', 'becoming', 'before', 'beforehand', 'behind', 'below', 'beside', 'between', 'beyond', 'both', 'bottom', 'brief', 'but', 'can', 'cannot', 'cant', 'cause', 'causes', 'certain', 'certainly', 'changes', 'clearly', 'comes', 'concerning', 'consequently', 'consider', 'considering', 'contain', 'containing', 'contains', 'corresponding', 'couldnt', 'course', 'currently', 'definitely', 'described', 'despite', 'didnt', 'different', 'does', 'doesnt', 'doing', 'done', 'dont', 'down', 'downwards', 'during']);
    return stopWords.has(word);
  }
}

export const ragDataFetchers = new RagDataFetchers();