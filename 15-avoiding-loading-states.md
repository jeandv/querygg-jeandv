## Avoiding Loading States

Las indicaciones de carga (loading indicators) son una parte fundamental de la experiencia de navegar por la web. Sin embargo, hay pocas cosas que puedan empeorar más una experiencia para tu usuario que una implementación deficiente de las interfaces de carga.

Afortunadamente, React Query viene con algunas APIs integradas que te ayudan a evitar los indicadores de carga por completo, o a hacerlos más manejables cuando no puedes evitarlos.

Para demostrar estas opciones, vamos a crear una aplicación simple que obtiene algunas publicaciones de blog de la API de dev.to y las muestra en una lista en la que puedes hacer clic para ver la publicación completa.

Aquí tienes una versión básica, sin optimizar.

api.js:
// Artificially delay the response so we can better see loading states.
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const globalFetch = window.fetch
window.fetch = async (...args) => {
  await delay(1000)
  return globalFetch(...args)
}

export async function fetchPosts() {
  const url = `https://dev.to/api/articles`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to fetch posts')
  }

  return response.json()
}

export async function fetchPost(path) {
  const url = `https://dev.to/api/articles${path}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to fetch post')
  }

  return response.json()
}


App.js:
import * as React from 'react'
import markdownit from 'markdown-it'
import { useQuery } from '@tanstack/react-query'
import { fetchPost, fetchPosts } from './api'

function usePostList() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
    staleTime: 5000
  })
}

function usePost(path) {
  return useQuery({
    queryKey: ['posts', path],
    queryFn: () => fetchPost(path),
    staleTime: 5000
  })
}

function PostList({ setPath }) {
  const { status, data } = usePostList()

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>Error fetching posts</div>
  }

  return (
    <div>
      {data.map((post) => (
        <p key={post.id}>
          <a
            onClick={() => setPath(post.path)}
            href="#"
          >
            {post.title}
          </a>
          <br />
          {post.description}
        </p>
      ))}
    </div>
  )
}

function PostDetail({ path, setPath }) {
  const { status, data } = usePost(path)

  const back = (
    <div>
      <a onClick={() => setPath(undefined)} href="#">
        Back
      </a>
    </div>
  )

  if (status === 'pending') {
    return <div>...</div>
  }
  
  if (status === 'error') {
    return (
      <div>
        {back}
        Error fetching {path}
      </div>
    )
  }

  const html = markdownit().render(data?.body_markdown || "")

  return (
    <div>
      {back}
      <h1>{data.title}</h1>
      <div
        dangerouslySetInnerHTML={{__html: html}}
      />
    </div>
  )
}

export default function Blog() {
  const [path, setPath] = React.useState()

  return (
    <div>
      {path
        ? <PostDetail path={path} setPath={setPath} />
        : <PostList setPath={setPath} />
      }
    </div>
  )
}


A estas alturas, ya deberías sentirte bastante cómodo con el código de esta aplicación.

Incluso sin optimizaciones, nuestra aplicación sigue funcionando bastante bien gracias al cacheo (caching) integrado que proporciona React Query. En la carga inicial tanto de la vista de lista como de la vista de detalles de la publicación, vemos nuestro indicador de carga. Pero después de eso, los datos han sido almacenados en caché y obtenemos nuestra interfaz de usuario final al instante.

Desafortunadamente, la "carga inicial" va a ser una ocurrencia común para los usuarios de una aplicación como esta, y es el mayor cuello de botella de rendimiento que tenemos. ¿Se te ocurre alguna forma de mejorarlo?

¿Qué pasaría si, en lugar de esperar a que el usuario haga clic en un enlace para obtener los datos de la nueva ruta, los obtenemos por adelantado? De esa manera, cuando el usuario haga clic en el enlace, los datos ya estarán disponibles en la caché y verá la interfaz de usuario final al instante.

Si no estás familiarizado, esta técnica se llama precarga (prefetching) y React Query la soporta de forma nativa.

Por supuesto, la parte más complicada de la precarga es saber cuándo deberías precargar. Es tentador simplemente precargar todos los datos que podrías necesitar, pero eso llevaría a un exceso de obtención de datos (overfetching) y muy probablemente causaría problemas de rendimiento.

Específicamente para nuestra aplicación, lo que necesitamos es algún tipo de indicador de que el usuario está interesado en leer una publicación específica. Si lo está, podemos precargar los datos de esa publicación para que estén listos cuando visite esa página.

Para hacer esto, ¿qué pasaría si "Usamos la Plataforma™" y escuchamos el evento onMouseEnter en la etiqueta de anclaje (anchor tag) que enlaza a una publicación? Es una suposición bastante segura que, cuando un usuario pasa el ratón sobre un enlace, probablemente hará clic en él.

Así es como se vería con React Query.


<a
  onClick={() => setPath(post.path)}
  href="#"
  onMouseEnter={() => {
    queryClient.prefetchQuery({
      queryKey: ['posts', post.path],
      queryFn: () => fetchPost(post.path),
      staleTime: 5000
    })
  }}
>
  {post.title}
</a>


El API queryClient.prefetchQuery es la herramienta de React Query para desencadenar una precarga de forma imperativa. Ejecutará la función de consulta (queryFn) y almacenará el resultado en la caché bajo la clave de consulta (queryKey) proporcionada.

Dado que el único objetivo del API de precarga es obtener datos dentro de la caché, no devuelve ningún dato (solo una Promise vacía que puedes esperar con await si lo necesitas).

La pregunta más importante que probablemente tienes con este código es de dónde viene queryClient.

Este es el mismo objeto queryClient que inicializaste en la raíz de tu aplicación y que pasaste a QueryClientProvider. Puedes acceder a él mediante el hook de React Query useQueryClient.


import{ useQueryClient } from '@tanstack/react-query'

...

const queryClient = useQueryClient()


Final Response
No desestructures el queryClient

Es importante notar que no puedes desestructurar propiedades del QueryClient.

const { prefetchQuery } = useQueryClient() // ❌

La razón de esto es que el QueryClient es una clase, y las clases no pueden ser desestructuradas en JavaScript sin perder la referencia a su enlace this.

Esto no es algo específico de React Query; tendrás el mismo problema al hacer algo como:

const { getTime } = new Date()


Puede que hayas notado que el objeto que pasamos a prefetchQuery tiene la misma forma (queryKey, queryFn, staleTime) que un objeto que pasaríamos a useQuery.

Debido a esto, no es una mala idea abstraer este objeto en una función creadora (maker function) que puedas invocar cada vez que necesites las opciones de consulta. De esta manera, puedes usar fácilmente las mismas opciones tanto para useQuery como para prefetchQuery.


function getPostQueryOptions(path) {
  return {
    queryKey: ['posts', path],
    queryFn: () => fetchPost(path),
    staleTime: 5000
  }
}

...

function usePost(path) {
  return useQuery(getPostQueryOptions(path))
}

...

<a
  onClick={() => setPath(post.path)}
  href="#"
  onMouseEnter={() => {
    queryClient.prefetchQuery(getPostQueryOptions(post.path))
  }}
>
  {post.title}
</a>


Para los usuarios de TypeScript

Dado que la función getPostQueryOptions no está vinculada a nada de React Query, no es completamente segura en cuanto a tipos (not type safe). Por ejemplo, si escribimos mal staleTime como staletime, TypeScript no se quejará; la propiedad en exceso simplemente será ignorada.

Aquí tienes un que muestra este comportamiento.

Para esta situación, React Query expone una función llamada queryOptions que restaurará la seguridad de tipos a la que estás acostumbrado:


import { queryOptions } from '@tanstack/react-query'

function getPostQueryOptions(path: string) {
  return queryOptions({
    queryKey: ['posts', path],
    queryFn: () => fetchPost(path),
    // 🚨 Esto generaría un error de compilación.
    staletime: 5000, 
  })
}


Ahora, esto generaría un error apropiadamente, como era de esperar:

Object literal may only specify known properties, but 'staletime' does not exist [...]. Did you mean to write 'staleTime'?

Puedes ver esto en acción en este playground (parque de juegos). https://www.typescriptlang.org/play?#code/JYWwDg9gTgLgBAbzgRwK4FMoE8DyYbAQB2AznAL5wBmUEIcA5AAIwCGpbAxgNYD0U6VpxgBaNJiwMAsAChZ6AB6RY1VEWGEicSCRgBFDNgAUYVjAAWALji6owIgHMAlIllw4AmKihbx2PATEJEYIbu4ohlgA0uhY1gDaDDowJAwANNpm5gC6aWHuflgAYkTWRi4AvAB8cAAKtCDAJOgAdAIkEAA2AG7oJllOeTLhNmyd6AQg6NYArHAAVHAAjAAMa0Pu5E6y5EA


Y si introducimos este código en nuestra aplicación, así es como se comportaría.


import * as React from 'react'
import markdownit from 'markdown-it'
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchPost, fetchPosts } from './api'

function getPostQueryOptions(path) {
  return {
    queryKey: ['posts', path],
    queryFn: () => fetchPost(path),
    staleTime: 5000
  }
}

function usePostList() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
    staleTime: 5000
  })
}

function usePost(path) {
  return useQuery(getPostQueryOptions(path))
}

function PostList({ setPath }) {
  const { status, data } = usePostList()
  const queryClient = useQueryClient()

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>Error fetching posts</div>
  }

  return (
    <div>
      {data.map((post) => (
        <p key={post.id}>
          <a
            onClick={() => setPath(post.path)}
            href="#"
            onMouseEnter={() => {
              queryClient.prefetchQuery(getPostQueryOptions(post.path))
            }}
          >
            {post.title}
          </a>
          <br />
          {post.description}
        </p>
      ))}
    </div>
  )
}

function PostDetail({ path, setPath }) {
  const { status, data } = usePost(path)

  const back = (
    <div>
      <a onClick={() => setPath(undefined)} href="#">
        Back
      </a>
    </div>
  )

  if (status === 'pending') {
    return <div>...</div>
  }
  
  if (status === 'error') {
    return (
      <div>
        {back}
        Error fetching {path}
      </div>
    )
  }

  const html = markdownit().render(data?.body_markdown || "")

  return (
    <div>
      {back}
      <h1>{data.title}</h1>
      <div
        dangerouslySetInnerHTML={{__html: html}}
      />
    </div>
  )
}

export default function Blog() {
  const [path, setPath] = React.useState()

  return (
    <div>
      {path
        ? <PostDetail path={path} setPath={setPath} />
        : <PostList setPath={setPath} />
      }
    </div>
  )
}


Respuesta Final
Date cuenta de que si pasas el ratón sobre un enlace, esperas un poco y luego haces clic, no verás un indicador de carga porque los datos de esa publicación ya estarán en la caché.

Puedes ver esto aún más claramente si abres las herramientas de desarrollador y luego pasas el ratón sobre un enlace. Tan pronto como lo haces, se agregará una nueva entrada a la caché.

Ahora, una pregunta que podrías tener es por qué también añadimos un staleTime a nuestra consulta. Lo genial de prefetchQuery es que respeta el staleTime de la consulta que estás precargando. Esto significa que si ya hay datos frescos (fresh) en la caché, React Query simplemente ignorará la solicitud de precarga por completo.

Si no tuviéramos un staleTime de 5000, cada vez que pasaras el ratón sobre el enlace se activaría una nueva solicitud, ya que el staleTime predeterminado en React Query es 0.

Siguiendo la misma lógica, si solo quisieras precargar si no hay datos en la caché, podrías pasar un staleTime de Infinity.


queryClient.prefetchQuery({
  ...getPostQueryOptions(post.path),
  staleTime: Infinity
})


Ahora bien, es evidente que la precarga es una opción sólida para evitar los indicadores de carga, pero no es una solución milagrosa (silver bullet). Todavía hay una solicitud asíncrona ocurriendo, y en realidad, no tienes idea de cuánto tiempo tardará en resolverse. Es totalmente probable que, incluso con la precarga, el usuario siga viendo un indicador de carga si la respuesta es lenta.

Esto nos lleva a otra optimización potencial que podemos hacer: evitar por completo los estados de carga.

En nuestro ejemplo, antes de que el usuario haga clic para ir a la página de la publicación, ya tenemos algunos de los datos que necesitamos para ella. Específicamente, tenemos el id y el title de la publicación. No son todos los datos, pero puede ser suficiente para mostrar una interfaz de usuario de marcador de posición (placeholder UI) al usuario mientras esperamos que se cargue el resto de la información.

Para hacer esto, React Query tiene el concepto de initialData.

Si pasas initialData a useQuery, React Query utilizará los datos que esta función devuelva para inicializar la entrada de caché de esa consulta.


useQuery({
  queryKey,
  queryFn,
  initialData: () => {
    
  }
})


Así que, en lo que respecta a nuestro ejemplo, lo que necesitamos resolver es cómo obtener los datos específicos de la publicación de la caché para poder utilizarlos para inicializar nuestra consulta de la publicación.


function usePost(path) {
  return useQuery({
    ...getPostQueryOptions(path),
    initialData: () => {
      // return cache[path]?
    }
  })
}


Una vez más, queryClient al rescate.

Recuerda, el queryClient es lo que contiene la caché. Para acceder a los datos almacenados en caché directamente, puedes usar queryClient.getQueryData. Este método toma la queryKey como argumento y devolverá lo que esté en la caché para esa entrada.

Así que, en nuestro ejemplo, podemos usar queryClient.getQueryData(['posts']) para obtener la lista de publicaciones, y luego usar find para obtener la publicación específica que necesitamos para inicializar la caché de la consulta de la publicación.


function usePost(path) {
  const queryClient = useQueryClient()

  return useQuery({
    ...getPostQueryOptions(path),
    initialData: () => {
      return queryClient.getQueryData(['posts'])
        ?.find((post) => post.path === path)
    }
  })
}


Para los usuarios de TypeScript

Por defecto, queryClient.getQueryData devolverá unknown, ya que React Query no puede saber qué tipo de dato reside bajo cada queryKey. Las definiciones de las consultas se hacen ad hoc (cuando llamas a useQuery por primera vez) y no de antemano (por ejemplo, a través de un esquema).

Sin embargo, si pasas una queryKey que fue creada mediante la función queryOptions, puedes recuperar esa seguridad de tipos, ya que esa clave está ligada a la queryFn, la cual está tipada correctamente:


import { queryOptions } from '@tanstack/react-query'

const postQueryOptions = queryOptions({
  queryKey: ['posts'],
  queryFn: fetchPosts,
  staleTime: 5000
})

// Los datos devueltos por getQueryData ahora están tipados.
const data = queryClient.getQueryData(
  postQueryOptions.queryKey
)


Échale un vistazo a este TypeScript playground: data ahora estará tipado como lo que devuelva la función fetchPosts. https://www.typescriptlang.org/play?#code/JYWwDg9gTgLgBAbzgRwK4FMoE8DyYbAQB2AzgDRwCKG2AwgDbDpHwC+cAZlBCHAOQABGAENSIgMYBrAPRR0w8TAC0aTFj4BYAFDbxxEvFV1GzeAF44RdAHcqNLAyYsAFAEpt2mFjDo4ABQgDOAskYAATAC44AyhgIgBzAG44MGEYAAsomLikuAIYenQsmFiEuFYPLTD0cXphOU5UIkVCIk50GHF0gIMSNyi-bhBgEnQAHgBBKChhLDGemAA+Rcq9MRTAmBI8An1glHsd1r6EbTgDtQBpdCwogG0+SF6+AF0yM4vsADEiKI4OroLcjaVjuHRaNZBMJpYT7IwOEwsAB08Q61DUABEYc4Pk8tkd9Ej4dcsNowdpoSJtNJpHAAHoAfiAA


Así que ahora, si actualizamos nuestro hook usePost para incluir nuestro código de initialData, así es cómo se comportaría: