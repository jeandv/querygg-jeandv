## Dependent Queries

Hemos estado marcando lentamente todos los diferentes escenarios que encontrarías al obtener datos en una aplicación web real.

Comenzamos obteniendo datos de un endpoint estático, luego introdujimos parámetros dinámicos y después aprendimos a obtener datos a demanda.

Este es el siguiente paso en nuestro recorrido de obtención de datos, y es uno importante: obtener datos que dependen del resultado de otra petición.

Si bien generalmente es mejor ejecutar las consultas en paralelo para minimizar el tiempo que un usuario tiene que esperar a que los datos terminen de cargarse, a veces, esto simplemente no es posible.

Como ejemplo, vamos a obtener información sobre una película y su director. Debido a que encaja convenientemente con lo que estamos tratando de aprender, la API no nos da todo lo que quisiéramos mostrar de inmediato; solo devuelve el id del director, el cual luego tenemos que usar para obtener la información del director.

Sin React Query, así es como se vería obtener esos datos.


async function fetchMovie(title) {
  const response = await fetch(
    `https://ui.dev/api/courses/react-query/movies/${title}`
  )

  if (!response.ok) {
    throw new Error('fetch failed')
  }

  return response.json()
}

async function fetchDirector(id) {
  const response = await fetch(
    `https://ui.dev/api/courses/react-query/director/${id}`
  )

  if (!response.ok) {
    throw new Error('fetch failed')
  }

  return response.json()
}

async function getMovieWithDirectorDetails(title) {
  const movie = await fetchMovie(title)
  const director = await fetchDirector(movie.director)

  return { movie, director }
}


Entonces, ¿cómo se vería esto si lo combinamos con nuestro conocimiento de React Query?

Bueno, una forma de abordar las consultas dependientes es no considerarlas como consultas separadas en absoluto. Ya debería estar claro que la queryFn no necesita estar acoplada a una única obtención de datos (fetch).

Así que una idea que podrías haber tenido es hacer algo como esto.


App.js:
import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import { fetchMovie, fetchDirector } from './api'

function useMovieWithDirectorDetails(title) {
  return useQuery({
    queryKey: ['movie', title],
    queryFn: async () => {
      const movie = await fetchMovie(title)
      const director = await fetchDirector(movie.director)

      return { movie, director }
    },
  })
}

function Movie({ title }) {
  const { data, status } = useMovieWithDirectorDetails(title)

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>There was an error fetching the information for {title}.</div>
  }

  return (
    <p>
      Title: {data.movie.title} ({data.movie.year})
      <br />
      Director: {data.director.name}
    </p>
  )
}

export default function App() {
  return (
    <Movie title="The Godfather" />
  )
}


api.js
export async function fetchMovie(title) {
  const response = await fetch(
    `https://ui.dev/api/courses/react-query/movies/${title}`
  )

  if (!response.ok) {
    throw new Error('fetch failed')
  }

  return response.json()
}

export async function fetchDirector(id) {
  const response = await fetch(
    `https://ui.dev/api/courses/react-query/director/${id}`
  )

  if (!response.ok) {
    throw new Error('fetch failed')
  
  }
  return response.json()
}


Esto funciona, pero hay una contrapartida: acopla fuertemente nuestras dos peticiones.

Esto puede ser algo bueno; por ejemplo, no tenemos que preocuparnos por estados de loading (cargando) o error separados, ya que solo tenemos una consulta. Sin embargo, también significa que los datos se almacenan en caché juntos, y eso conlleva algunas desventajas.

Desventajas
Siempre se obtendrán y se volverán a obtener juntos
Debido a que ambas peticiones están en la misma consulta, incluso si quisiéramos, no podríamos simplemente volver a obtener una parte de nuestros datos. Por ejemplo, no podemos volver a obtener solo la película sin volver a obtener también al director.
Por la misma razón, tampoco podemos establecer configuraciones diferentes (como staleTime o refetchInterval) para cada petición.
En lo que respecta a React Query, solo hay un recurso. No importa que provenga de dos peticiones de red.

Generarán error juntos
Incluso si solo una de las dos peticiones falla, la consulta completa estará en un estado de error.
Esto puede ser lo que deseas, o tal vez quieras seguir mostrando parte de la interfaz de usuario (como la información de la película) incluso si los detalles del director no pudieron obtenerse.

No hay de-duplicación para ninguna de las peticiones
Este es probablemente el mayor inconveniente. Debido a que ambas peticiones están bajo la misma queryKey, no tienes forma de saber si ciertos datos ya han sido obtenidos y almacenados en caché en otro lugar.
Por ejemplo, si tienes una segunda película que fue dirigida por la misma persona, no puedes reutilizar los datos originales y no habrá ninguna de-duplicación de peticiones. En su lugar, simplemente haríamos la misma petición de nuevo y la almacenaríamos en otra parte de la caché.
Puedes verlo si abres las devtools y observas las entradas de la caché: ambas tienen los mismos datos del director, y se hicieron dos peticiones para obtenerlos.


App.js:
import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import { fetchMovie, fetchDirector } from './api'

function useMovieWithDirectorDetails(title) {
  return useQuery({
    queryKey: ['movie', title],
    queryFn: async () => {
      const movie = await fetchMovie(title)
      const director = await fetchDirector(movie.director)

      return { movie, director }
    },
  })
}

function Movie({ title }) {
  const { data, status } = useMovieWithDirectorDetails(title)

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>There was an error fetching the information for {title}.</div>
  }

  return (
    <p>
      Title: {data.movie.title} ({data.movie.year})
      <br />
      Director: {data.director.name}
    </p>
  )
}

export default function App() {
  return (
    <>
      <Movie title="The Godfather" />
      <Movie title="The Godfather Part II" />
    </>
  )
}


De nuevo, esto no siempre es malo, pero debes ser consciente de las contrapartidas que estás haciendo al decidir combinar consultas de esta manera.

En este caso de uso específico, probablemente sea mejor adoptar un enfoque diferente para evitar las desventajas mencionadas anteriormente. La razón es que el director es una entidad totalmente diferente a la película. Si las almacenamos en caché por separado, tendremos más flexibilidad en cómo las utilizamos a lo largo de nuestra aplicación.

En cierto modo, puedes pensar en las consultas dependientes como una forma especial de obtener datos a demanda. Sin embargo, en lugar de retrasar la consulta hasta que ocurra un evento, estás retrasando la consulta hasta que otra consulta haya terminado de obtener los datos.

Para hacer esto, primero dividamos nuestro hook useMovieWithDirectorDetails en dos hooks separados: uno para obtener la película y otro para obtener el director.


function useMovie(title) {
  return useQuery({
    queryKey: ['movie', title],
    queryFn: async () => fetchMovie(title),
  })
}

function useDirector(id) {
  return useQuery({
    queryKey: ['director', id],
    queryFn: async () => fetchDirector(id),
    enabled: id !== undefined
  })
}


Fíjate que la consulta para useDirector está deshabilitada (disabled) cuando id es undefined. Esa es la clave para que esto funcione. Solo queremos obtener el director cuando tenemos un id con el cual obtenerlo.

Incluso podemos seguir teniendo un hook useMovieWithDirectorDetails que abstraiga la lógica de combinar las dos consultas.


function useMovie(title) {
  return useQuery({
    queryKey: ['movie', title],
    queryFn: async () => fetchMovie(title),
  })
}

function useDirector(id) {
  return useQuery({
    queryKey: ['director', id],
    queryFn: async () => fetchDirector(id),
    enabled: id !== undefined
  })
}

function useMovieWithDirectorDetails(title) {
  const movie = useMovie(title)
  const directorId = movie.data?.director
  const director = useDirector(directorId)

  return {
    movie,
    director
  }
}


Fíjate que el id que estamos pasando a useDirector proviene de la consulta de la película (movie), y cuando ese id es undefined (lo cual será el caso cuando la consulta de la película todavía esté pending), la consulta del director estará deshabilitada (disabled).

Ahora, a diferencia de antes, obtendremos entradas de caché separadas para cada película, y una única entrada para el director. Esto nos da control total sobre cómo definimos y usamos cada recurso.

Con estos cambios, tendremos que manejar dos estados de loading (cargando) y error separados, pero de nuevo, esa suele ser la contrapartida correcta ya que es más flexible. Específicamente en este ejemplo, nos permite mostrar nuestro indicador de carga y mensaje de error basándonos solo en la consulta de la película, sin importar lo que suceda con la consulta del director.


import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import { fetchMovie, fetchDirector } from './api'

function useMovie(title) {
  return useQuery({
    queryKey: ['movie', title],
    queryFn: async () => fetchMovie(title),
  })
}

function useDirector(id) {
  return useQuery({
    queryKey: ['director', id],
    queryFn: async () => fetchDirector(id),
    enabled: id !== undefined
  })
}

function useMovieWithDirectorDetails(title) {
  const movie = useMovie(title)
  const directorId = movie.data?.director
  const director = useDirector(directorId)

  return {
    movie,
    director
  }
}

function Movie({ title }) {
  const { movie, director } = useMovieWithDirectorDetails(title)

  if (movie.status === 'pending') {
    return <div>...</div>
  }

  if (movie.status === 'error') {
    return <div>Error fetching {title}</div>
  }

  return (
    <p>
      Title: {movie.data.title} ({movie.data.year})
      <br />
      { director?.data
        ? <> Director: {director.data.name}</>
        : null
      }
    </p>
  )
}

export default function App() {
  return (
    <>
      <Movie title="The Godfather" />
      <Movie title="The Godfather Part II" />
    </>
  )
}


Si abres las devtools, también notarás por primera vez que tenemos dos Observers para la misma consulta, ["director", 1].

Esto tiene sentido, significa que ambas películas están usando la misma entrada en la caché, ya que ambas se encuentran bajo la misma queryKey.