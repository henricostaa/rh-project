# Plurix — Design System Guide

> Documento de referência oficial para geração e manutenção de interfaces no ATS Plurix 360°.

---

## 1. Visão Geral e Boas Práticas

Este documento define o Design System da Plurix e deve ser estritamente seguido em qualquer desenvolvimento ou ajuste de interface. As diretrizes abaixo garantem consistência visual e evitam erros comuns de interpretação.

---

### Boas práticas

**Referência de cores pelo nome semântico**
Sempre use o nome do token ao referenciar cores, nunca o valor hexadecimal isolado. O nome carrega a intenção de uso — a IA e o desenvolvedor devem resolver o hex a partir do token.

✅ Correto: `Background/Main Color/Default` (#00147d)  
❌ Evitar: `#00147d` sem contexto semântico

**Tipografia pelo nome do estilo**
Use o nome do text style definido na seção 3.2. Isso garante que tamanho, peso, line-height e letter-spacing sejam aplicados em conjunto, sem omissões.

✅ Correto: `Single Line/Body Base`  
❌ Evitar: `font-size: 16px; font-weight: 400` sem line-height / estilo adequado

**Hierarquia visual clara**
Toda interface deve ter uma hierarquia legível: um elemento principal de destaque (título, CTA ou métrica), elementos secundários de suporte e elementos terciários auxiliares. Nunca usar pesos ou tamanhos de tipografia fora da escala definida para forçar destaque.

**Espaçamento consistente**
Todo espaçamento interno (padding) e entre elementos (gap) deve seguir a escala de tokens de espaçamento. Não usar valores arbitrários como `13px` ou `22px`.

**Componentes como base, não como regra**
Os componentes documentados na seção 4 são referências visuais. Tamanhos, número de colunas e presença de ícones podem ser adaptados ao contexto — desde que tokens de cor, tipografia, borda e sombra sejam preservados.

**Desktop primeiro**
Toda interface deve ser gerada e validada primeiro para desktop (acima de 1024px). Adaptações para tablet e mobile vêm depois, via media queries, sem comprometer o layout principal.

**Logo sempre à esquerda**
Quando o logo estiver presente, deve estar alinhado à esquerda e em tamanho legível (altura mínima de 24px). A versão do logo segue o fundo: azul escuro em fundos claros, azul claro em fundos Main Color.

---

### O que evitar

- **Não introduzir novas cores** fora da paleta definida na seção 3.1 — nem tons intermediários, nem opacidades não documentadas.
- **Não misturar fontes** — usar somente Inter (interfaces) e Roboto Mono (código).
- **Não usar sombras arbitrárias** — usar somente a escala `Drop Shadow` e `Inner Shadow` da seção 3.3.
- **Não centralizar o logo** no header — sempre à esquerda.
- **Não usar cores de feedback** (Positive, Warning, Danger) fora de contexto de estado — nunca como cor de destaque decorativo.
- **Não ignorar estados interativos** — botões, inputs e itens de menu devem ter hover, active e disabled definidos com os tokens correspondentes.
- **Não criar componentes com radius arbitrário** — usar somente os valores da escala de radius do sistema.

---

## 2. Logo

A Plurix possui duas versões do logo principal, aplicadas conforme o fundo da interface.

**Regra de aplicação:**
| Contexto | Versão | Cor do logo | Hex |
|---|---|---|---|
| Fundo branco / claro (`Background/Default/*`) | Logo Azul Escuro | `#00147E` | `--navy` |
| Fundo escuro Main Color (`Background/Main Color/*`) | Logo Azul Claro | `#4FB9EA` | `--blue-light` |

### Logo Azul Escuro — fundos claros

```svg
<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" id="a" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 1920 1080" style="enable-background:new 0 0 1920 1080;" xml:space="preserve">
<style type="text/css">.st0{fill:#00147E;}</style>
<g>
  <path class="st0" d="M564.2,371.8H626v331.7h-61.9V371.8z"/>
  <path class="st0" d="M962.2,456.5v246.5h-61.4v-82c-17,50.2-56.9,87.4-116.1,87.4c-79.8,0-110.7-55.6-110.7-116.1V456.5h61.9v128.2c0,45.3,23.3,69.9,66.8,69.9c56.9,0,98.2-43.5,98.2-134v-64.1L962.2,456.5L962.2,456.5z"/>
  <path class="st0" d="M1225.3,459.4c-13.8-4.2-30.5-6.9-47.6-6.9c-56.5,0-92.8,35-109.4,82v-78h-61.9v246.5h61.9v-68.1c0-82,39.4-129.1,104-129.1c22.4,0,40,5.2,52.9,11.3V459.4L1225.3,459.4z"/>
  <g>
    <path class="st0" d="M1269.6,456.5h61.9v246.5h-61.9V456.5L1269.6,456.5z"/>
    <circle class="st0" cx="1300.5" cy="406.3" r="35"/>
  </g>
  <path class="st0" d="M1554.4,601.7l24.4-22.5l120.1-123.3h-79.3l-83.8,86.4c-9.1-51.1-53.2-89.9-106.4-89.9c-18.9,0-36.8,3.6-53.3,10.1v60.3c15.7-9,33.9-14.2,53.3-14.2c37.7,0,70.8,19.5,90.2,49l-22.8,21.6l-120.6,123.3h79.8l82.9-86.3c8,52.4,52.8,92.6,106.8,92.6c18.9,0,36.8-3.6,53.3-10.1v-60.3c-15.7,9-33.9,14.2-53.3,14.2C1607.3,652.5,1573.6,632.2,1554.4,601.7L1554.4,601.7L1554.4,601.7z"/>
  <path class="st0" d="M389.2,371.4H221.1v331.1h65.3V562.2c30.4,9,65.9,14.2,103.9,14.2c76.7,0.5,126.4-45.8,126.4-105.5S460.9,371.4,389.2,371.4L389.2,371.4z M440,505.1c-12.8,12.8-33.3,19.8-58,19.8h-0.8c-29.4,0-58-3.9-82.7-11.2l-12.1-4.6v-86h93.9c48.3,0,73.6,24.2,73.6,48.2C453.9,484.5,449.2,495.9,440,505.1L440,505.1L440,505.1z"/>
</g>
</svg>
```

### Logo Azul Claro — fundos escuros (Main Color)

```svg
<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" id="a" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 1920 1080" style="enable-background:new 0 0 1920 1080;" xml:space="preserve">
<style type="text/css">.st0{fill:#4FB9EA;}</style>
<g>
  <path class="st0" d="M564.2,371.8H626v331.7h-61.9V371.8z"/>
  <path class="st0" d="M962.2,456.5v246.5h-61.4v-82c-17,50.2-56.9,87.4-116.1,87.4c-79.8,0-110.7-55.6-110.7-116.1V456.5h61.9v128.2c0,45.3,23.3,69.9,66.8,69.9c56.9,0,98.2-43.5,98.2-134v-64.1L962.2,456.5L962.2,456.5z"/>
  <path class="st0" d="M1225.3,459.4c-13.8-4.2-30.5-6.9-47.6-6.9c-56.5,0-92.8,35-109.4,82v-78h-61.9v246.5h61.9v-68.1c0-82,39.4-129.1,104-129.1c22.4,0,40,5.2,52.9,11.3V459.4L1225.3,459.4z"/>
  <g>
    <path class="st0" d="M1269.6,456.5h61.9v246.5h-61.9V456.5L1269.6,456.5z"/>
    <circle class="st0" cx="1300.5" cy="406.3" r="35"/>
  </g>
  <path class="st0" d="M1554.4,601.7l24.4-22.5l120.1-123.3h-79.3l-83.8,86.4c-9.1-51.1-53.2-89.9-106.4-89.9c-18.9,0-36.8,3.6-53.3,10.1v60.3c15.7-9,33.9-14.2,53.3-14.2c37.7,0,70.8,19.5,90.2,49l-22.8,21.6l-120.6,123.3h79.8l82.9-86.3c8,52.4,52.8,92.6,106.8,92.6c18.9,0,36.8-3.6,53.3-10.1v-60.3c-15.7,9-33.9,14.2-53.3,14.2C1607.3,652.5,1573.6,632.2,1554.4,601.7L1554.4,601.7L1554.4,601.7z"/>
  <path class="st0" d="M389.2,371.4H221.1v331.1h65.3V562.2c30.4,9,65.9,14.2,103.9,14.2c76.7,0.5,126.4-45.8,126.4-105.5S460.9,371.4,389.2,371.4L389.2,371.4z M440,505.1c-12.8,12.8-33.3,19.8-58,19.8h-0.8c-29.4,0-58-3.9-82.7-11.2l-12.1-4.6v-86h93.9c48.3,0,73.6,24.2,73.6,48.2C453.9,484.5,449.2,495.9,440,505.1L440,505.1L440,505.1z"/>
</g>
</svg>
```

---

## 3. Design Tokens

### 3.1 Cores

#### Background

```json
{
  "Background": {
    "Default": {
      "Default":          "#ffffff",
      "Secondary":        "#f5f5f5",
      "Tertiary":         "#d9d9d9",
      "Default Hover":    "#f5f5f5",
      "Secondary Hover":  "#e6e6e6",
      "Tertiary Hover":   "#b3b3b3"
    },
    "Main Color": {
      "Default":          "#00147d",
      "Secondary":        "#000c49",
      "Hover":            "#001164",
      "Secondary Hover":  "#00082e",
      "Tertiary":         "#e4e8ff",
      "Tertiary Hover":   "#adbbff"
    },
    "Secondary Color": {
      "Default":          "#50baec",
      "Hover":            "#19a1e0",
      "Secondary":        "#1275a3",
      "Secondary Hover":  "#0b4966",
      "Tertiary":         "#daf0fb",
      "Tertiary Hover":   "#c1e7f8"
    },
    "Positive": {
      "Default":          "#14ae5c",
      "Secondary":        "#cff7d3",
      "Hover":            "#009951",
      "Secondary Hover":  "#aff4c6",
      "Tertiary":         "#ebffee",
      "Tertiary Hover":   "#cff7d3"
    },
    "Warning": {
      "Default":          "#e8b931",
      "Secondary":        "#fff1c2",
      "Hover":            "#e5a000",
      "Secondary Hover":  "#ffe8a3",
      "Tertiary":         "#fffbeb",
      "Tertiary Hover":   "#fff1c2"
    },
    "Danger": {
      "Default":          "#ec221f",
      "Secondary":        "#fdd3d0",
      "Hover":            "#c00f0c",
      "Secondary Hover":  "#fcb3ad",
      "Tertiary":         "#fee9e7",
      "Tertiary Hover":   "#fdd3d0"
    },
    "Disabled": {
      "Default":          "#d9d9d9"
    },
    "Neutral": {
      "Default":          "#5a5a5a",
      "Hover":            "#434343",
      "Secondary":        "#cdcdcd",
      "Secondary Hover":  "#b2b2b2",
      "Tertiary":         "#e3e3e3",
      "Tertiary Hover":   "#cdcdcd"
    },
    "Utilities": {
      "Scrim":            "#ffffffcc",
      "Overlay":          "#00000080",
      "Blanket":          "#000000b3"
    }
  }
}
```

#### Text

```json
{
  "Text": {
    "Default": {
      "Default":    "#1e1e1e",
      "Secondary":  "#757575",
      "Tertiary":   "#b3b3b3"
    },
    "Main Color": {
      "Default":            "#00147d",
      "Secondary":          "#00082e",
      "On Brand":           "#ffffff",
      "On Brand Secondary": "#e4e8ff",
      "Tertiary":           "#e4e8ff",
      "On Brand Tertiary":  "#00147d"
    },
    "Secondary Color": {
      "Default":            "#50baec",
      "Secondary":          "#0b4966",
      "Tertiary":           "#daf0fb",
      "On Brand":           "#ffffff",
      "On Brand Secondary": "#daf0fb",
      "On Brand Tertiary":  "#50baec"
    },
    "Positive": {
      "Default":              "#02542d",
      "Secondary":            "#009951",
      "Tertiary":             "#14ae5c",
      "On Positive":          "#ebffee",
      "On Positive Secondary":"#02542d",
      "On Positive Tertiary": "#02542d"
    },
    "Warning": {
      "Default":             "#522504",
      "Secondary":           "#975102",
      "Tertiary":            "#bf6a02",
      "On Warning":          "#401b01",
      "On Warning Secondary":"#682d03",
      "On Warning Tertiary": "#522504"
    },
    "Danger": {
      "Default":            "#900b09",
      "Secondary":          "#c00f0c",
      "Tertiary":           "#ec221f",
      "On Danger":          "#fee9e7",
      "On Danger Secondary":"#900b09",
      "On Danger Tertiary": "#900b09"
    },
    "Disabled": {
      "Default":     "#b3b3b3",
      "On Disabled": "#b3b3b3"
    },
    "Neutral": {
      "Default":            "#303030",
      "Secondary":          "#5a5a5a",
      "Tertiary":           "#767676",
      "On Neutral":         "#f3f3f3",
      "On Neutral Secondary":"#303030",
      "On Neutral Tertiary": "#434343"
    }
  }
}
```

#### Border

```json
{
  "Border": {
    "Default": {
      "Default":   "#d9d9d9",
      "Secondary": "#757575",
      "Tertiary":  "#383838"
    },
    "Main Color": {
      "Default":   "#001164",
      "Secondary": "#00082e",
      "Tertiary":  "#adbbff"
    },
    "Secondary Color": {
      "Default":   "#19a1e0",
      "Secondary": "#0b4966",
      "Tertiary":  "#c1e7f8"
    },
    "Positive": {
      "Default":   "#02542d",
      "Secondary": "#009951",
      "Tertiary":  "#14ae5c"
    },
    "Warning": {
      "Default":   "#522504",
      "Secondary": "#975102",
      "Tertiary":  "#bf6a02"
    },
    "Danger": {
      "Default":   "#900b09",
      "Secondary": "#c00f0c",
      "Tertiary":  "#ec221f"
    },
    "Disabled": {
      "Default":   "#b3b3b3"
    },
    "Neutral": {
      "Default":   "#303030",
      "Secondary": "#767676",
      "Tertiary":  "#b2b2b2"
    }
  }
}
```

#### Paletas de cor (primitivos)

```json
{
  "Main Color":      { "100":"#e4e8ff","200":"#adbbff","300":"#2449ff","400":"#0023d1","500":"#00147d","600":"#001164","700":"#000c49","800":"#00082e","900":"#000312","1000":"#000209" },
  "Secondary Color": { "100":"#daf0fb","200":"#c1e7f8","300":"#9bd8f4","400":"#76c9f0","500":"#50baec","600":"#19a1e0","700":"#1275a3","800":"#0b4966","900":"#072c3d","1000":"#020f14" },
  "Green":           { "100":"#ebffee","200":"#cff7d3","300":"#aff4c6","400":"#85e0a3","500":"#14ae5c","600":"#009951","700":"#008043","800":"#02542d","900":"#024023","1000":"#062d1b" },
  "Yellow":          { "100":"#fffbeb","200":"#fff1c2","300":"#ffe8a3","400":"#e8b931","500":"#e5a000","600":"#bf6a02","700":"#975102","800":"#682d03","900":"#522504","1000":"#401b01" },
  "Red":             { "100":"#fee9e7","200":"#fdd3d0","300":"#fcb3ad","400":"#f4776a","500":"#ec221f","600":"#c00f0c","700":"#900b09","800":"#690807","900":"#4d0b0a","1000":"#300603" },
  "Gray":            { "100":"#f5f5f5","200":"#e6e6e6","300":"#d9d9d9","400":"#b3b3b3","500":"#757575","600":"#444444","700":"#383838","800":"#2c2c2c","900":"#1e1e1e","1000":"#111111" },
  "Slate":           { "100":"#f3f3f3","200":"#e3e3e3","300":"#cdcdcd","400":"#b2b2b2","500":"#949494","600":"#767676","700":"#5a5a5a","800":"#434343","900":"#303030","1000":"#242424" },
  "Blue":            { "100":"#f1f6fd","200":"#e1ebfa","300":"#c0d4f5","400":"#9ebef1","500":"#3f81ea","600":"#3271d7","700":"#2a61ba","800":"#224a8a","900":"#183057","1000":"#15253f" },
  "Pink":            { "100":"#fcf1fd","200":"#fae1fa","300":"#f5c0ef","400":"#f19edc","500":"#ea3fb8","600":"#d732a8","700":"#ba2a92","800":"#8a226f","900":"#57184a","1000":"#3f1536" }
}
```

**Regras de uso:**
- `Background/Main Color/Default` (#00147d) → fundo de CTAs principais (botão primário).
- `Background/Default/Default` (#ffffff) → fundo padrão de páginas e cards.
- `Background/Default/Secondary` (#f5f5f5) → fundo de superfícies secundárias.
- `Text/Default/Default` (#1e1e1e) → texto padrão de todo o produto.
- `Text/Default/Secondary` (#757575) → textos auxiliares, labels, placeholders.
- `Text/Main Color/On Brand` (#ffffff) → texto sobre fundos de Main Color.
- `Background/Danger/Default` (#ec221f) / `Background/Positive/Default` (#14ae5c) / `Background/Warning/Default` (#e8b931) → exclusivamente para feedback de estado.
- `Background/Disabled/Default` (#d9d9d9) → fundo de elementos desabilitados.

---

### 3.2 Tipografia

```json
{
  "typography": {
    "font-family-primary": "Inter",
    "font-family-code": "Roboto Mono",
    "styles": {
      "Title Hero":       { "size": "72px", "weight": "Bold",      "line-height": "120%", "letter-spacing": "-3%" },
      "Title Page":       { "size": "48px", "weight": "Bold",      "line-height": "120%", "letter-spacing": "-2%" },
      "Subtitle":         { "size": "32px", "weight": "Regular",   "line-height": "120%", "letter-spacing": "0%"  },
      "Heading":          { "size": "24px", "weight": "Semi Bold", "line-height": "120%", "letter-spacing": "-2%" },
      "Subheading":       { "size": "20px", "weight": "Regular",   "line-height": "120%", "letter-spacing": "0%"  },
      "Body Base":        { "size": "16px", "weight": "Regular",   "line-height": "140%", "letter-spacing": "0%"  },
      "Body Strong":      { "size": "16px", "weight": "Semi Bold", "line-height": "140%", "letter-spacing": "0%"  },
      "Body Emphasis":    { "size": "16px", "weight": "Italic",    "line-height": "140%", "letter-spacing": "0%"  },
      "Body Link":        { "size": "16px", "weight": "Regular",   "line-height": "140%", "letter-spacing": "0%",  "text-decoration": "underline" },
      "Body Small":       { "size": "14px", "weight": "Regular",   "line-height": "140%", "letter-spacing": "0%"  },
      "Body Small Strong":{ "size": "14px", "weight": "Semi Bold", "line-height": "140%", "letter-spacing": "0%"  },
      "Body Code":        { "size": "16px", "weight": "Regular",   "line-height": "130%", "letter-spacing": "0%",  "font-family": "Roboto Mono" },
      "Single Line/Body Base":        { "size": "16px", "weight": "Regular",   "line-height": "100%", "letter-spacing": "0%" },
      "Single Line/Body Small Strong":{ "size": "14px", "weight": "Semi Bold", "line-height": "100%", "letter-spacing": "0%" }
    }
  }
}
```

---

### 3.3 Sombras (Effects)

#### Drop Shadow

```json
{
  "Drop Shadow": {
    "100": "0px 1px 4px 0px #0c0c0d0d",
    "200": "0px 1px 4px 0px #0c0c0d1a, 0px 1px 4px 0px #0c0c0d0d",
    "300": "0px 4px 4px -1px #0c0c0d1a, 0px 4px 4px -1px #0c0c0d0d",
    "400": "0px 16px 32px -4px #0c0c0d1a, 0px 4px 4px -4px #0c0c0d0d",
    "500": "0px 16px 16px -8px #0c0c0d1a, 0px 4px 4px -4px #0c0c0d0d",
    "600": "0px 16px 32px -8px #0c0c0d66"
  }
}
```

#### Inner Shadow

```json
{
  "Inner Shadow": {
    "100": "inset 0px 1px 4px 0px #0c0c0d0d",
    "200": "inset 0px 1px 4px 0px #0c0c0d0d",
    "300": "inset 0px 4px 4px -1px #0c0c0d0d",
    "400": "inset 0px 16px 32px -4px #0c0c0d1a",
    "500": "inset 0px 16px 16px -8px #0c0c0d1a",
    "600": "inset 0px 16px 32px -8px #0c0c0d66"
  }
}
```

---

## 4. Componentes

### 4.1 Card (tool-item)
- Width: Fixed 228px (ou responsivo no grid)
- Fill: `Background/Default/Default` (#ffffff)
- Border: `Border/Main Color/Tertiary` (#adbbff)
- Corner radius: 12px
- Gap: 8px

### 4.2 Sidebar / Menu de Navegação
- Width: Fixed 240px
- Fill: `Background/Default/Default` (#ffffff)
- Border: `Border/Default/Default` (#d9d9d9)
- Gap: 32px

### 4.3 Header
- Height: Hug 56px
- Fill: `Background/Main Color/Default` (#00147d)
- Logo: Alinhado à **esquerda**, versão Azul Claro (`#4FB9EA`)

### 4.4 Botões
| Variante | Cor de fundo | Cor do texto |
|---|---|---|
| Primary | `Background/Main Color/Default` (#00147d) | `Text/Main Color/On Brand` (#ffffff) |
| Secondary | Transparente, borda `Border/Default/Default` (#d9d9d9) | `Text/Default/Default` (#1e1e1e) |
| Ghost | Transparente | `Text/Main Color/Default` (#00147d) |
| Disabled | `Background/Disabled/Default` (#d9d9d9) | `Text/Disabled/Default` (#b3b3b3) |
| Danger | `Background/Danger/Default` (#ec221f) | `Text/Main Color/On Brand` (#ffffff) |

---

## 5. Layout e Grid

- **Desktop-first**: Projetar e validar prioritariamente para telas > 1024px.
- **Largura máxima do conteúdo**: `1280px`
- **Colunas do grid**: `12`
- **Gap entre colunas**: `16px`
- **Breakpoints**: Desktop (> 1024px), Tablet (641px – 1024px), Mobile (até 640px).
