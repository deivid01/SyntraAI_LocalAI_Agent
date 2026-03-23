# Syntra AI - Walkthrough de Automação Híbrida

Este documento detalha o novo sistema de automação inteligente da Syntra AI, que combina visão computacional e interação dinâmica.

## Novas Funcionalidades de Visão

O sistema agora não depende mais de coordenadas fixas. Ele "vê" a tela para encontrar elementos.

### 1. OCR Inteligente (`ocrEngine`)
- **Extração de Texto**: Lê todos os textos visíveis na tela.
- **Localização**: Retorna as coordenadas exatas de palavras ou frases (ex: "Buscar", "Play", "Search").
- **Confiança**: Filtra ruídos para garantir cliques precisos.

### 2. Correspondência de Modelos (`templateMatcher`)
- **Templates de Imagem**: Encontra ícones e botões através de imagens pequenas (templates) armazenadas em `assets/templates`.
- **Resiliência**: Funciona mesmo que o texto não seja legível, comparando pixels.

### 3. Estratégia de Fallback (`fallbackHandler`)
O sistema é resiliente e segue este fluxo de decisão:
1. Tenta encontrar o elemento via **OCR** (texto).
2. Se falhar, tenta via **Template Matching** (imagem).
3. Se ambos falharem, executa **Atalhos de Teclado** configurados (ex: `Space` para Play, `Ctrl+L` para Search).

## Exemplo Prático: Spotify Dinâmico

Quando você diz: *"Abra o Spotify e toque minha playlist Rockzão"*, a Syntra executa:

1. **Abre** o Spotify e aguarda a interface carregar.
2. Usa **OCR** para encontrar o texto "Buscar" e clica nele.
3. Se o texto não for encontrado (ex: ícone apenas), usa o **Template** da lupa.
4. Digita "Rockzão" e pressiona **Enter**.
5. Usa **OCR** ou **Template** para clicar no botão de "Play" dinamicamente.

---
## Como Testar
1. Abra a pasta `release\win-unpacked`.
2. Execute `SyntraAI.exe`.
3. Peça: *"Abra o Spotify e procure por Rockzão"*.
4. Observe os logs em tempo real no console da aplicação para ver a visão em ação!

---
*Syntra AI - Automação Inteligente e Dinâmica.*
