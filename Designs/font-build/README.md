# Regenerar la fuente UOMI

`UOMI/fonts/uomi.otf` se genera a partir de los SVG de `Designs/Alfabeto`
(A–Z, a–z, Ñ, ñ) más los números, la puntuación y las tildes que dibuja el propio script.

```
cd Designs/font-build
npm init -y
npm install opentype.js@2.0.0 polygon-clipping@0.15.7
node build-font.js ../../UOMI/fonts/uomi.otf
```

Después sube el `?v=N` de `url("fonts/uomi.otf?v=N")` en `UOMI/styles.css` para que los navegadores
descarguen la versión nueva.

- Los glifos que faltan en los SVG (números, puntuación, tildes) están definidos en el script
  (busca `glyphs["0"]`, `ACC`, etc.). Para cambiar uno, edita su definición ahí.
