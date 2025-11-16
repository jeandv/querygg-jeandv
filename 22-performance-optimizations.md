## Performance Optimizations

Si has estado construyendo aplicaciones React por un tiempo, puede que hayas experimentado este escenario.

Tu aplicación está progresando bien, cuando de repente lo notas: un problema de rendering (renderizado). Nada grave, solo algunos tartamudeos aquí y allá.

Así que haces lo que cualquier buen desarrollador haría: lo ignoras y esperas lo mejor — no, abres las React DevTools y notas que uno de tus componentes se está renderizando con mucha más frecuencia de lo que debería. Esto no siempre es un problema, pero en esta aplicación en particular tienes algunos componentes hijos costosos, lo cual se nota.

Aunque generalmente es una buena idea encontrar formas de hacer que los componentes se rendericen más rápido en lugar de menos — a veces, es inevitable.

Afortunadamente, React en sí mismo nos ofrece algunas opciones para resolver estos problemas — y para asegurarnos de que estamos en sintonía, hagamos un repaso rápido de algunos fundamentos de renderizado de React.

Cuando se trata de renderizado, la forma en que funciona React es que cada vez que cambia el estado, volverá a renderizar el componente que posee ese estado y todos sus componentes hijos, independientemente de si esos componentes hijos aceptan o no alguna prop (propiedad).

Podemos ver esto en acción con esta aplicación básica. Observa que cada vez que haces clic en el botón, aunque el componente Wave no dependa de ninguna prop, aún se vuelve a renderizar (re-renderiza).