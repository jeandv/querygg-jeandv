## Persisting Queries and Mutations

La salsa secreta de React Query es su capa de caché: es rápida, es eficiente y es (en su mayor parte) fácil de usar. Pero al igual que mi pobre Tamagotchi cuando era niño, tiene una característica desafortunada: es de corta duración.

Debido a que la caché de React Query es solo en memoria, cada vez que un usuario cierra la pestaña del navegador, navega a otro sitio o simplemente recarga la página, la caché se pierde para siempre.

Ahora, esto no siempre es un problema (por eso es el comportamiento predeterminado de React Query), pero hay ciertas circunstancias en las que sería bueno tener una caché más persistente, por ejemplo, en aplicaciones offline-first o aplicaciones móviles donde la conectividad de red puede ser irregular.

Afortunadamente, React Query tiene una solución encantadora para esto que llama Persisters (Persistidores).

💾 ¿Qué son los Persisters?
Los Persisters son un plugin opcional que tomará lo que esté en la caché de query y lo persistirá en una ubicación más permanente de tu elección (piensa en localStorage o IndexedDB). Una vez que los datos son persistidos, tan pronto como la aplicación se carga, los datos persistidos serán restaurados a la caché antes de que React Query haga cualquier otra cosa.

🛠️ Configuración del Persister
La primera decisión al usar persistidores es elegir dónde quieres persistir tus datos. La respuesta a esta pregunta decidirá qué plugin de persister instalas:

API Síncrona (como localStorage): Utilizarás el plugin @tanstack/query-sync-storage-persister.

API Asíncrona (como IndexedDB): Utilizarás el plugin @tanstack/query-async-storage-persister.

En nuestro ejemplo, persistiremos nuestras queries en localStorage con el plugin @tanstack/query-sync-storage-persister.

1. Creación del Persister:

Primero, crearemos un persister usando la función createSyncStoragePersister que proporciona el plugin query-sync-storage-persister.


import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

const queryClient = new QueryClient()

const persister = createSyncStoragePersister({
  storage: localStorage
})


La única opción requerida que necesitamos pasar a createSyncStoragePersister es el storage que queremos usar (en este caso, localStorage). Lo que obtendremos a cambio es un objeto que contiene funciones de bajo nivel para persistir y restaurar toda la caché de query desde y hacia ese almacenamiento.

2. Uso del Adaptador de React:

Aunque podrías usar este objeto persister directamente, para la mayoría de los casos de uso de React, querrás usar el adaptador específico del framework, que ofrece una abstracción simple sobre esa API de bajo nivel.

En nuestro caso específico de React, podemos usar el adaptador @tanstack/react-query-persist-client, que hará todo el trabajo pesado de persistencia por nosotros.

Solo tuvimos que reemplazar QueryClientProvider con PersistQueryClientProvider y pasar el persister como una propiedad dentro del prop persistOptions.


import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

const queryClient = new QueryClient()

const persister = createSyncStoragePersister({
  storage: window.localStorage
})

export default function App(){
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      ...
    </PersistQueryClientProvider>
  )
}


Y si introducimos todo esto en una aplicación real, observa cómo se comporta.


Blog.jsx:
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


App.jsx:
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import Blog from './Blog'

const queryClient = new QueryClient()

const persister = createSyncStoragePersister({
  storage: window.localStorage
})

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <Blog />
    </PersistQueryClientProvider>
  )
}


Con PersistQueryClientProvider, cualquier dato que se almacene en la caché ahora está disponible inmediatamente incluso después de que se recargue el sandbox (entorno de pruebas). Y lo que es aún mejor, cada vez que la caché cambia, esa actualización se sincronizará automáticamente con localStorage por nosotros.

Ahora, hay un inconveniente que quizás hayas notado: PersistQueryClientProvider es un provider global y afectará a cada query de nuestra aplicación. Puede que llegue un momento en el que queramos ser más selectivos sobre qué se persiste.

Por ejemplo, si tuviéramos una query que contuviera información sensible del usuario, es mejor no almacenarla en localStorage. Afortunadamente, React Query nos permite personalizar qué se almacena mediante su propiedad dehydrateOptions.


<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{
    persister,
    dehydrateOptions: {
      
    },
  }}
>


Así es como funciona:

Cada vez que una query está a punto de escribirse en el almacenamiento persistente, React Query llamará al método shouldDehydrateQuery que se encuentra en el objeto dehydrateOptions, pasándole el objeto query activo.


<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{
    persister,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {} // <- Lógica de filtro aquí
    },
  }}
>


Si shouldDehydrateQuery devuelve true, la query será persistida. Si devuelve false, la query no será persistida.


🚰 Hidratación:

En el Desarrollo Web, la Hidratación (hydration) generalmente se refiere al proceso en el que el HTML estático se enriquece con JavaScript del lado del cliente.

En React Query, el término Hidratación se utiliza cada vez que la Caché de Query se restaura desde una ubicación externa. Lo opuesto, la Deshidratación (dehydration), describe la técnica de hacer que la Caché de Query sea serializable en una cadena de texto.

Esto se utiliza tanto para la persistencia en almacenamientos externos con los plugins Persister, como para el Renderizado del Lado del Servidor (SSR), lo que veremos más adelante en el curso.

Persistencia Selectiva (dehydrateOptions)
Ahora, la pregunta es: ¿cómo determinas si shouldDehydrateQuery debe devolver true o false? Derivando ese valor de la query que shouldDehydrateQuery recibe.

Al fin y al cabo, si quieres excluir una query específica o un subconjunto de queries de ser persistidas, es probable que lo hagas debido a alguna característica única de esa query.

Una aproximación simple podría ser mirar la propia queryKey. Por ejemplo, si solo quisieras persistir queries que tuvieran una clave específica, podrías hacer algo como esto:


<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{
    persister,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        if (query.queryKey[0] === "posts") {
          return true
        }

        return false
      }
    },
  }}
>


Otro enfoque interesante podría ser utilizar el campo meta que puedes añadir a cualquier query. Puedes pensar en meta como un lugar para almacenar información arbitraria sobre una query que no afecta a la caché de query en sí misma.

Así, por ejemplo, podríamos añadir una propiedad meta.persist a nuestro hook usePostList.


function usePostList() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
    staleTime: 5000,
    meta: {
      persist: true // Indicador personalizado para la persistencia
    }
  })
}


Luego, dentro de shouldDehydrateQuery, podríamos verificar la propiedad persist, persistiendo solo las queries que la tengan establecida en true.


<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{
    persister,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        return query.meta.persist === true
      }
    },
  }}
>


Esta lógica nos permite dar fácilmente la capacidad de que cualquier query opte por ser persistida (opt-into being persisted) de forma individualizada, query por query.


- Para Usuarios de TypeScript:

La propiedad meta se establece por defecto en el tipo Record<string, unknown>. De manera similar a como definirías un tipo Error global, también puedes especificar un tipo meta global para todas tus queries.


declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: {
      persist?: boolean // Ahora 'persist' es una propiedad conocida en todos los 'meta' de las queries
    }
  }
}


Ahora, hay otro aspecto de shouldDehydrateQuery en el que quizás no hayas pensado: ¿qué sucede si la query no tiene éxito? En ese escenario, probablemente no quieras persistir la query, ya que los datos probablemente no estén disponibles o estén obsoletos.

Podrías, por supuesto, derivar esa lógica mirando el status o la data de la query, pero React Query te lo facilita exponiendo una función defaultShouldDehydrateQuery que puedes usar como base para tu propia lógica.

defaultShouldDehydrateQuery es la implementación predeterminada de React Query para shouldDehydrateQuery y garantiza que solo las queries exitosas sean persistidas. Al implementar tu propio shouldDehydrateQuery, es una buena idea incluir ese comportamiento predeterminado en tu lógica.


import { defaultShouldDehydrateQuery } from '@tanstack/react-query'

// ...

<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{
    persister,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        // Solo persistir si la query es exitosa Y si tiene meta.persist = true
        return defaultShouldDehydrateQuery(query) 
          && query.meta.persist === true
      }
    },
  }}
>


Con eso, solo las queries exitosas que tienen meta.persist establecido en true serán persistidas en localStorage.

⏱️ Tiempo de Vida de la Caché:

Pero tan importante como qué se persiste, es por cuánto tiempo se persiste. Lo más probable es que las queries que elijas persistir en un almacenamiento externo sean aquellas que quieres conservar por más tiempo.

Sin embargo, debido a que el almacenamiento persistente se sincroniza con la caché de query, y la caché de query se recolectará como basura (garbage collected) cuando su gcTime haya transcurrido, si no tienes cuidado, podrías terminar con una situación en la que las queries sean recolectadas como basura y, por lo tanto, eliminadas del almacenamiento persistente demasiado pronto.

Para solucionar esto, querrás asegurarte de que el gcTime de una query sea la duración por la que deseas mantener los datos tanto en la caché como en el almacenamiento persistente.

Además, el persister en sí también tiene una propiedad maxAge que define el tiempo máximo que los datos persistidos serán válidos, y por defecto es de 24 horas.

Si intentamos restaurar una caché que es más antigua que maxAge, esos datos se descartarán.

Como regla general, es una buena idea definir el gcTime con el mismo valor o superior a maxAge para evitar que tus queries sean recolectadas como basura y eliminadas del almacenamiento demasiado pronto:


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 12, // 12 horas
    },
  },
})

// ...

<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{
    persister,
    maxAge: 1000 * 60 * 60 * 12, // 12 horas
  }}
>


🚨 Manejo de Errores de Almacenamiento:

Por último, cada vez que escribes en un almacenamiento persistente, tienes que manejar cualquier error que pueda ocurrir al hacerlo.

Por ejemplo, la mayoría de los almacenamientos tienen un límite en la cantidad de datos que pueden persistir. Para localStorage, suele ser alrededor de 5MB, y si se supera ese límite, normalmente verás un Error como este:

Uncaught DOMException: Failed to execute 'setItem' on 'Storage': Setting the value of 'REACT_QUERY_OFFLINE_CACHE' exceeded the quota.

Debido a que la caché de query se persiste como un todo, este Error significaría que no se almacenó nada.

Para resolver esto, createSyncStoragePersister te permite definir qué debe suceder cuando ocurre un error a través de su opción retry.


import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

const queryClient = new QueryClient()

const persister = createSyncStoragePersister({
  storage: localStorage,
  retry: ({ persistedClient, error, errorCount }) => {} // Función para intentar estrategias de reintento
})


Cuando se invoca, retry recibirá un objeto con tres propiedades: persistedClient, error y errorCount.

persistedClient es un objeto que contiene todas las queries que formaron parte del intento de persistencia.

error es el error que ocurrió.

errorCount es el número de veces que ha ocurrido el error.

Puedes usar estos valores para derivar tu propia lógica de reintento. React Query continuará intentando reintentos hasta que la persistencia funcione, o hasta que se devuelva undefined.

Por ejemplo, si solo quisieras minimizar la cantidad de datos persistidos a solo la query más reciente, podrías hacer algo como esto:


const persister = createSyncStoragePersister({
  storage: localStorage,
  retry: ({ persistedClient, error, errorCount }) => {
    const sortedQueries = [
      ...persistedClient.clientState.queries
    ].sort((a, b) =>
      b.state.dataUpdatedAt - a.state.dataUpdatedAt
    )
  
    const newestQuery = sortedQueries[0]

    // Abortar si el reintento no funcionó o si ya se intentó más de una vez
    if (!newestQuery || errorCount > 1) {
      return undefined
    }

    // Devolver un nuevo objeto persistido que solo contenga la query más reciente
    return {
      ...persistedClient,
      clientState: {
        ...persistedClient.clientState,
        queries: [newestQuery],
      },
    }
  }
})


O, incluso mejor, podrías usar una de las estrategias de reintento predefinidas que proporciona @tanstack/react-query-persist-client, como removeOldestQuery, que disminuirá la cantidad de datos persistidos eliminando la query más antigua de la caché:


import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { removeOldestQuery } from '@tanstack/react-query-persist-client'

const queryClient = new QueryClient()

const persister = createSyncStoragePersister({
  storage: localStorage,
  retry: removeOldestQuery // Estrategia predefinida
})


Independientemente de la estrategia retry que elijas, siempre es una buena idea manejar estos puntos de fallo para asegurar que tu aplicación continúe funcionando como se espera.

