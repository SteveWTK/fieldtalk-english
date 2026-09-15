The Global Player mark — use it anywhere the brand signs a surface; pick `open` for product/digital and `crest` for authority.

```jsx
<Logo mark="open" size={32} />
<Logo mark="crest" size={78} sting="draw" />
<Logo mark="open" tone="monoLime" size={60} />   {/* on a solid lime field */}
<Logo mark="crest" tone="tonalLight" size={46} /> {/* on white / print */}
```

Rules the component already enforces: bar order slate 500 → slate 400 → lime 400, stroke weight thickening as size drops, crest shield at 3.2px (4.5px under 48). Never recolour the top bar; never rotate, skew or vary weights independently. Crest minimum 32px, open minimum 16px — below 32px use `mark="open"`.
