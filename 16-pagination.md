## Pagination

Las API pueden devolver datos en varios formatos y tamaños, desde objetos pequeños y únicos hasta grandes conjuntos de datos que contienen miles de registros.

Por ejemplo, la API en https://uuid.rocks/json devuelve un solo objeto JSON con menos de 500 bytes de datos.


{
  "apiVersion":"v1.3.0",
  "uuid":"24dbfb76-5725-4974-b159-52ac9a34c8ab",
  "is_readable_uuid":false,
  "is_short_uuid":false,
  "is_ulid":false,
  "timestamp":"2024-05-11T14:15:49.670Z"
}


Sin embargo, otras API podrían darte acceso a miles de registros, cada uno con kilobytes de datos.

Por ejemplo, un solo registro de issue de la API de GitHub pesa 3 kb por sí solo, y algunos repositorios como facebook/react tienen más de 10,000 issues. Eso es una gran cantidad de datos para devolver en una sola solicitud.

Para manejar conjuntos de datos tan grandes de manera eficiente, las API a menudo implementan la paginación, una técnica que divide los datos en varias páginas.

Si nunca has trabajado con una API paginada, así es como funcionan típicamente:

La API proporciona una manera de especificar el número de página (page) y el número de registros por página (per_page) en los parámetros de la solicitud.

Al hacer una solicitud a la API, incluyes estos parámetros de paginación para indicar qué página de resultados deseas recuperar.

La API procesa tu solicitud y devuelve un subconjunto del total de datos basándose en el número de página y la cantidad de registros por página especificados.

Junto con los datos paginados, la respuesta generalmente incluye metadatos adicionales, como el número total de registros, el número de página actual y el número total de páginas disponibles.

Para recuperar la página siguiente, simplemente incrementas el número de page en tu solicitud subsiguiente, manteniendo el mismo número de registros por página.

Puedes seguir haciendo solicitudes con diferentes números de página para navegar por todo el conjunto de datos, una página a la vez.

Las API paginadas ayudan a gestionar grandes conjuntos de datos al dividirlos en fragmentos más pequeños y manejables. Este enfoque reduce la cantidad de datos transferidos en una única solicitud, mejora el rendimiento y permite una recuperación y visualización eficiente de los datos en tu aplicación.

Y sí, como probablemente ya puedes intuir, React Query tiene soporte incorporado para consultas paginadas.

Para demostrarlo, vamos a extender nuestra aplicación de repositorios de GitHub que vimos anteriormente en el curso, añadiéndole paginación.

Así es como comenzaremos (sin las partes paginadas).


import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import { fetchRepos } from "./api"
import Sort from './Sort'

function useRepos(sort) {
  return useQuery({
    queryKey: ['repos', { sort }],
    queryFn: () => fetchRepos(sort),
    staleTime: 10 * 1000,
  })
}

function RepoList({ sort }) {
  const { data, status } = useRepos(sort)

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>There was an error fetching the repos.</div>
  }

  return (
    <div>
      <ul>
        {data.map((repo) => 
          <li key={repo.id}>{repo.full_name}</li>
        )}
      </ul>
    </div>
  )
}

export default function Repos() {
  const [selection, setSelection] = React.useState('created')

  const handleSort = (sort) => {
    setSelection(sort)
  }

  return (
    <div>
      <Sort value={selection} onSort={handleSort} />
      <RepoList sort={selection} />
    </div>
  )
}


La forma en que funciona la API de paginación de GitHub es que puedes proporcionarle dos parámetros: page y per_page.

page define qué página se debe solicitar, y per_page define cuántas entradas debe tener cada página.

Para per_page, simplemente lo codificaremos a 4, ya que no hay una razón real para que necesite ser dinámico.


export async function fetchRepos(sort, page) {
  const response = await fetch(
    `https://api.github.com/orgs/TanStack/repos
      ?sort=${sort}
      &per_page=4
      &page=${page}`
  )
  
  if (!response.ok) {
    throw new Error(`Request failed with status: ${response.status}`)
  }

  return response.json()
}


En cuanto al parámetro page (página), lo gestionaremos como un estado de React que el usuario puede incrementar y decrementar.

Lo ubicaremos dentro del componente padre Repos, así podremos acceder a él y modificarlo desde los componentes hijos Sort y RepoList mediante props.


export default function Repos() {
  const [selection, setSelection] = React.useState('created')
  const [page, setPage] = React.useState(1)
  
  const handleSort = (sort) => {
    setSelection(sort)
    setPage(1)
  }

  return (
    <div>
      <Sort value={selection} onSort={handleSort} />
      <RepoList sort={selection} page={page} setPage={setPage} />
    </div>
  )
}


Ahora, dentro de RepoList, agregaremos nuestros botones y pasaremos la prop page como un argumento a useRepos. De esa manera, podemos añadirlo a la queryKey y pasarlo a fetchRepos dentro de la queryFn.


import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import { fetchRepos } from "./api"
import Sort from './Sort'

function useRepos(sort, page) {
  return useQuery({
    queryKey: ['repos', { sort, page }],
    queryFn: () => fetchRepos(sort, page),
    staleTime: 10 * 1000,
  })
}

function RepoList({ sort, page, setPage }) {
  const { data, status } = useRepos(sort, page)

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>There was an error fetching the repos.</div>
  }

  return (
    <div>
      <ul>
        {data.map((repo) => 
          <li key={repo.id}>{repo.full_name}</li>
        )}
      </ul>
      <div>
        <button
          onClick={() => setPage((p) => p - 1)}
          disabled={page === 1}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default function Repos() {
  const [selection, setSelection] = React.useState('created')
  const [page, setPage] = React.useState(1)
  
  const handleSort = (sort) => {
    setSelection(sort)
    setPage(1)
  }

  return (
    <div>
      <Sort value={selection} onSort={handleSort} />
      <RepoList sort={selection} page={page} setPage={setPage} />
    </div>
  )
}


Sin hacer mucho más que rastrear el estado de page y pasarlo a useQuery, ya tenemos una interfaz de usuario paginada bastante básica. Además, React Query se encargará de manejar el cacheo por nosotros de forma automática.

Hasta ahora, todo bien, pero obviamente aún no está listo para ser publicado.

Mejorémoslo (otra vez) minimizando la cantidad de veces que el usuario ve nuestro indicador de carga (...). En lugar de reemplazar toda la lista de repositorios con el indicador de carga cuando el usuario cambia de página, ¿qué pasaría si mantuviéramos la lista anterior hasta que la nueva estuviera lista?

Esto minimizaría el cambio de diseño (layout shift) en nuestra aplicación y haría que la experiencia se sintiera un poco más fluida.

Para hacer esto, recurriremos a una API que aprendimos en la última lección: placeholderData.

Algo de lo que no hablamos con respecto a placeholderData es que a la función que le pasas se le entregará el estado previo de la consulta como su primer argumento.


useQuery({
  queryKey,
  queryFn,
  placeholderData: (previousData) => {

  }
})


Lo que esto significa es que cada vez que el usuario cambie la página, podemos establecer el placeholderData de la consulta para que sean los datos anteriores. De esta manera, el usuario seguirá viendo la lista antigua de repositorios hasta que la lista nueva sea solicitada y añadida a la caché.


function useRepos(sort, page) {
  return useQuery({
    queryKey: ['repos', { sort, page }],
    queryFn: () => fetchRepos(sort, page),
    staleTime: 10 * 1000,
    placeholderData: (previousData) => previousData
  })
}


Y para que no cause confusión, también añadiremos algo de opacidad a la lista anterior de repositorios para darle un feedback al usuario.

Para hacer eso, podemos usar la propiedad isPlaceholderData de useQuery para establecer dinámicamente la opacidad de nuestra lista de repositorios.


import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import { fetchRepos } from "./api"
import Sort from './Sort'

function useRepos(sort, page) {
  return useQuery({
    queryKey: ['repos', { sort, page }],
    queryFn: () => fetchRepos(sort, page),
    staleTime: 10 * 1000,
    placeholderData: (previousData) => previousData
  })
}

function RepoList({ sort, page, setPage }) {
  const { data, status, isPlaceholderData } = useRepos(sort, page)

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>There was an error fetching the repos.</div>
  }

  return (
    <div>
      <ul style={{ opacity: isPlaceholderData ? 0.5 : 1 }}>
        {data.map((repo) => 
          <li key={repo.id}>{repo.full_name}</li>
        )}
      </ul>
      <div>
        <button
          onClick={() => setPage((p) => p - 1)}
          disabled={page === 1}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default function Repos() {
  const [selection, setSelection] = React.useState('created')
  const [page, setPage] = React.useState(1)

  const handleSort = (sort) => {
    setSelection(sort)
    setPage(1)
  }

  return (
    <div>
      <Sort value={selection} onSort={handleSort} />
      <RepoList sort={selection} page={page} setPage={setPage} />
    </div>
  )
}


Eso es mucho mejor y la navegación entre páginas se siente bastante bien.

Lo genial de esto es que no solo sirve para la paginación. Observa lo que sucede cuando cambias el modo de ordenamiento (sort): obtienes el mismo comportamiento.

La razón de esto es que, desde la perspectiva de React Query, solo le importa si el queryKey cambia. No importa si eso ocurre a través de un cambio en la página o en el ordenamiento.

Ahora, antes de que esto esté listo para implementarse, todavía hay un problema más que debemos abordar y que probablemente notaste: no estamos deshabilitando nuestros botones correctamente cuando es necesario.

Específicamente, queremos deshabilitar los botones mientras nuestra aplicación está obteniendo nuevos datos y cuando hemos alcanzado el final de la lista.

Para deshabilitar mientras se están obteniendo datos, ya tenemos acceso a isPlaceholderData, que es exactamente lo que necesitamos.


function RepoList({ sort, page, setPage }) {
  const { data, status, isPlaceholderData } = useRepos(sort, page)

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>There was an error fetching the repos.</div>
  }

  return (
    <div>
      <ul style={{ opacity: isPlaceholderData ? 0.5 : 1 }}>
        {data.map((repo) => 
          <li key={repo.id}>{repo.full_name}</li>
        )}
      </ul>
      <div>
        <button
          onClick={() => setPage((p) => p - 1)}
          disabled={isPlaceholderData || page === 1}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          disabled={isPlaceholderData}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}


Ahora, en cuanto a cómo deshabilitar el botón cuando llegamos al final de la lista.

La API de GitHub no devuelve un valor explícito que nos diga si hemos alcanzado la última página, pero podemos solucionarlo asumiendo que si no obtenemos una página completa (es decir, una que contenga la cantidad total de elementos especificada por per_page), entonces no quedan más páginas por solicitar.

Dado que depender de números mágicos es una mala práctica, y para evitar confusiones, primero actualicemos nuestra función fetchRepos para exportar el valor de per_page como una constante, ya que lo usaremos en múltiples lugares.


export const PAGE_SIZE = 4

export async function fetchRepos(sort, page) {
  const response = await fetch(
    `https://api.github.com/orgs/TanStack/repos
      ?sort=${sort}
      &per_page=${PAGE_SIZE}
      &page=${page}`
  )
  
  if (!response.ok) {
    throw new Error(`Request failed with status: ${response.status}`)
  }

  return response.json()
}


Ahora, dentro de RepoList, todo lo que tenemos que hacer es importar PAGE_SIZE y deshabilitar el botón "Siguiente" si la longitud de los datos que recibimos es menor que ese valor.


import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import { fetchRepos, PAGE_SIZE } from "./api"
import Sort from './Sort'

function useRepos(sort, page) {
  return useQuery({
    queryKey: ['repos', { sort, page }],
    queryFn: () => fetchRepos(sort, page),
    staleTime: 10 * 1000,
    placeholderData: (previousData) => previousData
  })
}

function RepoList({ sort, page, setPage }) {
  const { data, status, isPlaceholderData } = useRepos(sort, page)

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>There was an error fetching the repos.</div>
  }

  return (
    <div>
      <ul style={{ opacity: isPlaceholderData ? 0.5 : 1 }}>
        {data.map((repo) => 
          <li key={repo.id}>{repo.full_name}</li>
        )}
      </ul>
      <div>
        <button
          onClick={() => setPage((p) => p - 1)}
          disabled={isPlaceholderData || page === 1}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          disabled={isPlaceholderData || data?.length < PAGE_SIZE}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default function Repos() {
  const [selection, setSelection] = React.useState('created')
  const [page, setPage] = React.useState(1)

  const handleSort = (sort) => {
    setSelection(sort)
    setPage(1)
  }

  return (
    <div>
      <Sort value={selection} onSort={handleSort} />
      <RepoList sort={selection} page={page} setPage={setPage} />
    </div>
  )
}


Con eso, ¡tenemos una experiencia completamente paginada!

Gracias a la caché de React Query, hacer clic hacia adelante y hacia atrás entre páginas es instantáneo, y al hacer clic en páginas nuevas, se mostrará la página anterior mientras carga, evitando un salto de diseño brusco.

...pero, para obtener un crédito extra, ¿hay alguna forma de mejorar aún más la experiencia?

¿Qué pasaría si incorporamos otra característica que aprendimos en la lección anterior: la precarga (prefetching)?

Sin embargo, esta vez, en lugar de escuchar el evento onMouseEnter, ¿qué tal si precargamos siempre la página siguiente en segundo plano? De esa manera, cada vez que el usuario haga clic en "Siguiente", los datos ya estarían en la caché y obtendría la interfaz de usuario al instante.

Para hacer esto, primero extraeremos nuestras opciones de consulta para useRepos en una función separada para poder reutilizarla.


function getReposQueryOptions(sort, page) {
  return {
    queryKey: ['repos', { sort, page }],
    queryFn: () => fetchRepos(sort, page),
    staleTime: 10 * 1000
  }
}

function useRepos(sort, page) {
  return useQuery({
    ...getReposQueryOptions(sort, page),
    placeholderData: (previousData) => previousData
  })
}


Ahora, dentro de useRepos, añadiremos un hook useEffect que se encargará de precargar (prefetch) los datos para la página siguiente.


import * as React from "react"
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchRepos, PAGE_SIZE } from "./api"
import Sort from './Sort'

function getReposQueryOptions(sort, page) {
  return {
    queryKey: ['repos', { sort, page }],
    queryFn: () => fetchRepos(sort, page),
    staleTime: 10 * 1000
  }
}

function useRepos(sort, page) {
  const queryClient = useQueryClient()

  React.useEffect(() => {
    queryClient.prefetchQuery(getReposQueryOptions(sort, page + 1))
  }, [sort, page, queryClient])

  return useQuery({
    ...getReposQueryOptions(sort, page),
    placeholderData: (previousData) => previousData
  })
}

function RepoList({ sort, page, setPage }) {
  const { data, status, isPlaceholderData } = useRepos(sort, page)

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>There was an error fetching the repos.</div>
  }

  return (
    <div>
      <ul style={{ opacity: isPlaceholderData ? 0.5 : 1 }}>
        {data.map((repo) => 
          <li key={repo.id}>{repo.full_name}</li>
        )}
      </ul>
      <div>
        <button
          onClick={() => setPage((p) => p - 1)}
          disabled={isPlaceholderData || page === 1}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          disabled={isPlaceholderData || data?.length < PAGE_SIZE}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default function Repos() {
  const [selection, setSelection] = React.useState('created')
  const [page, setPage] = React.useState(1)

  const handleSort = (sort) => {
    setSelection(sort)
    setPage(1)
  }

  return (
    <div>
      <Sort value={selection} onSort={handleSort} />
      <RepoList sort={selection} page={page} setPage={setPage} />
    </div>
  )
}


¡Esa sí que es una experiencia pulida!

Al combinar la caché de React Query, la paginación y la precarga (prefetching), hemos construido una interfaz de usuario paginada asíncrona que se siente como si fuera síncrona.