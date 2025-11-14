## Customizing Defaults

A estas alturas, debería ser bastante claro que React Query te ofrece mucha flexibilidad cuando se trata de personalizar tus queries y mutaciones.

staleTime, refetchInterval, refetchOnMount, refetchOnWindowFocus, refetchOnReconnect, gcTime y enabled son solo algunas de estas opciones que hemos utilizado hasta ahora.

Y hasta este momento, siempre que hemos necesitado personalizar una query o mutación, lo hemos hecho pasando un objeto de opciones directamente a useQuery o useMutation.


function useProject(id) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id),
    staleTime: 10 * 1000,
  })
}


Esto funcionó bien, pero a medida que tu aplicación crece, podrías encontrarte repitiendo las mismas opciones una y otra vez.

Por ejemplo, quizás quieras establecer un staleTime por defecto de 10 segundos para cualquier query que no proporcione el suyo propio.

Por supuesto, una forma de solucionar esto sería crear un objeto de options compartido que puedas importar donde lo necesites:


import { defaultStaleTime } from "./options"

function useProject(id) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id),
    staleTime: defaultStaleTime,
  })
}


Pero aunque funciona, es una solución frágil que no se adapta bien.

Afortunadamente, React Query te ofrece una forma más simple de resolver este problema con algo que llama Valores por Defecto de Consulta (Query Defaults).

Cualquier opción que pueda pasarse a useQuery (aparte de queryKey) puede tener su valor por defecto establecido al pasar un objeto defaultOptions a tu queryClient cuando lo creas.


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 1000
    }
  }
})


Ahora, cualquier query que no tenga su propio staleTime utilizará el valor por defecto de 10 * 1000 milisegundos.


// uses the default staleTime of 10 seconds
function useProject(id) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id),
  })
}

// uses the provided staleTime of 5 seconds
function usePost(path) {
  return useQuery({
    queryKey: ['posts', path],
    queryFn: () => fetchPost(path),
    staleTime: 5000
  })
}


React Query también te da la flexibilidad de definir defaultOptions para un subconjunto específico de queries mediante Coincidencia Aproximada (Fuzzy Matching).

Por ejemplo, asume que tenemos las siguientes keys en nuestra caché:


['todos', 'list', { sort: 'id' }]
['todos', 'list', { sort: 'title' }]
['todos', 'detail', '1']
['todos', 'detail', '2']
['posts', 'list', { sort: 'date' }]
['posts', 'detail', '23']


Y asume que quisiéramos establecer el staleTime por defecto para solamente los detalles de Tareas (todos/detail/n) a 10 segundos.

Podríamos hacer esto invocando queryClient.setQueryDefaults, pasándole una queryKey y las opciones que deseas aplicar a todas las queries que coincidan con esa key.


queryClient.setQueryDefaults(
  ['todos', 'detail'],
  { staleTime: 10 * 1000 }
)


Ahora, gracias a la coincidencia aproximada (fuzzy matching), cualquier query que coincida con ['todos', 'detail'] heredará el staleTime por defecto de 10 segundos.


- ['todos', 'list', { sort: 'id' }]
- ['todos', 'list', { sort: 'title' }]
['todos', 'detail', '1']
['todos', 'detail', '2']
- ['posts', 'list', { sort: 'date' }]
- ['posts', 'detail', '23']



Entre establecer valores globales por defecto al crear el queryClient, establecer valores por defecto para un subconjunto de queries mediante setQueryDefaults, y establecer opciones a través de useQuery, tienes un control granular sobre las opciones para cualquier query o mutación en tu aplicación, y cada uno de estos niveles tiene precedencia sobre el anterior.


const finalOptions = {
  ...queryClientOptions,
  ...setQueryDefaultOptions,
  ...optionsFromUseQuery,
}


Y, como mencioné, cualquier opción que se pueda pasar a useQuery (aparte de queryKey) puede tener un valor por defecto, incluso la función de query (queryFn).

Esto es particularmente útil si todas las solicitudes en tu aplicación van a la misma API.

Por ejemplo, digamos que tenemos dos queries: una para obtener todas las publicaciones y otra para obtener una sola publicación por su ruta (path).


function usePostList() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const response = await fetch('/api/posts')

      if (!response.ok) {
        throw new Error('Failed to fetch posts')
      }

      return response.json()
    }
  })
}

function usePost(path) {
  return useQuery({
    queryKey: ['posts', path],
    queryFn: async () => {
      const response = await fetch(`/api/posts${path}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch post: ${path}`)
      }

      return response.json()
    }
  })
}


Si fueras un esclavo del principio D.R.Y. (No te Repitas), podrías sentirte tentado a extraer la queryFn en otra función que luego podrías compartir entre las dos queries.


async function fetchPosts(path = "") {
  const baseUrl = '/api/posts'
  const response = await fetch(baseUrl + path)

  if (!response.ok) {
    throw new Error('Failed to fetch')
  }

  return response.json()
}


Esto funciona, pero aunque hemos abstraído toda la lógica compartida de obtención de datos, aún necesitas recordar incluir la queryFn en cada query, además de pasarle la path correcta.


function usePostList() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: () => fetchPosts()
  })
}

function usePost(path) {
  return useQuery({
    queryKey: ['posts', path],
    queryFn: () => fetchPosts(path)
  })
}


En su lugar, ¿qué pasaría si utilizáramos setQueryDefaults para establecer una queryFn por defecto para todas las queries que coincidan con la key ['posts']?

Si pudiéramos hacer esto, simplificaríamos nuestras queries para que se vean así, lo que resolvería nuestros problemas:


function usePostList() {
  return useQuery({
    queryKey: ['posts']
  })
}

function usePost(path) {
  return useQuery({
    queryKey: ['posts', path]
  })
}


La clave para lograr esto es poder derivar la URL de la solicitud a partir de la queryKey, y puedes obtener acceso a la queryKey desde dentro de la queryFn utilizando el objeto QueryFunctionContext que React Query le pasa.


queryClient.setQueryDefaults(['posts'], {
  queryFn: async ({ queryKey }) => {
    const baseUrl = '/api/'
    // Combina la queryKey para formar la URL: ['posts', 'mi-post'] -> /api/posts/mi-post
    const slug = queryKey.join('/') 
    const response = await fetch(baseUrl + slug)

    if (!response.ok) {
      throw new Error('fetch failed')
    }

    return response.json()
  },
  staleTime: 5 * 1000
})


Otro beneficio de este enfoque es que hace imposible olvidar incluir una variable en la queryKey que necesitas en la queryFn.

Y por supuesto, si fuera necesario, aún puedes anular la queryFn por defecto proporcionando la tuya propia cuando llamas a useQuery.