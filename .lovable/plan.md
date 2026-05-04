## Alteração

Adicionar a mensagem **"Promoções sujeitas a alterações a qualquer momento."** como texto de rodapé (disclaimer) em todos os três templates de imagem (IG Post, Stories, WhatsApp).

### Detalhes técnicos

**Arquivo:** `src/components/TemplatePreview.tsx`

- Em cada um dos 3 blocos de template (instagram-post, instagram-stories, whatsapp-status), adicionar um `<p>` com o texto do disclaimer logo antes do fechamento do card, com fonte pequena (7-8px), cor cinza suave, para não competir com o conteúdo principal.
- O texto aparecerá na parte inferior de cada template, dentro da área exportável da imagem.
- Nenhum outro arquivo será alterado.