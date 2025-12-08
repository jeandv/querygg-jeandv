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