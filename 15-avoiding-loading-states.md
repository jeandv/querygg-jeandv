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