## Infinite Queries

Hace casi 20 años, el ingeniero de UI Aza Raskin inventó algo de lo que más tarde se arrepentiría profundamente: el scroll infinito. Este patrón, que permite a los usuarios desplazarse sin fin a través del contenido, se ha convertido desde entonces en un pilar para plataformas de redes sociales como Facebook, Pinterest e Instagram.

A pesar de su arrepentimiento, React Query hace que implementarlo sea ~sencillo.

Ya has visto cómo con la paginación tradicional, puedes crear una interfaz de usuario paginada simplemente incluyendo el número de página en la queryKey.

Con las listas infinitas, el hecho de que useQuery solo pueda mostrar datos para el queryKey actual funciona en nuestra desventaja.

Lo que realmente queremos es tener una única entrada de caché a la que podamos añadir (append) los datos cada vez que obtengamos información nueva.

Esto es exactamente lo que te permite hacer el hook useInfiniteQuery de React Query. Funciona casi igual que useQuery, pero existen algunas diferencias fundamentales.

Tanto al solicitar datos para listas infinitas como para listas paginadas, obtienes los datos a lo largo del tiempo en bloques (chunks). Para hacer esto, necesitas una forma de saber qué ya has solicitado y qué solicitar a continuación.

Típicamente, como vimos en nuestro ejemplo de Repositorios, esto se hace a través de un número de página.

Con nuestro ejemplo de paginación, creamos el número de página con el estado de React, permitimos que el usuario lo incrementara y decrementara a través de la UI, y luego lo pasamos a nuestro custom hook para usarlo dentro de la queryKey y la queryFn.


const [page, setPage] = React.useState(1)

...

const { data, status } = useRepos(sort, page)


