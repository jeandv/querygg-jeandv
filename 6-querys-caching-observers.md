## Queries, Caching, and Observers

Esto es lo que sabes hasta ahora sobre React Query.

React Query es un gestor de estado asíncrono que es muy consciente de las necesidades del estado del servidor. Su funcionamiento consiste en que, a través de useQuery, recupera y almacena datos en la memoria caché QueryCache y crea un Observer que escucha y notifica a React los cambios en esa memoria caché.

Aunque la API es bastante sencilla, puede resultar complicado seguir mentalmente las responsabilidades de cada uno de estos diferentes aspectos de React Query. Por eso, en esta lección, con el fin de ayudarte realmente a conceptualizar cómo encajan todas las piezas, vamos a implementar nuestra propia versión mini de React Query.

Abróchate el cinturón.

"¿No hicimos esto ya?
En la lección «¿Por qué React Query?» terminamos reimplementando una versión simple de useQuery. Esto fue principalmente para mostrar las dificultades de usar useEffect para la gestión asíncrona del estado.


La reimplementación en esta lección será más completa y más precisa técnicamente (aunque seguirá siendo una versión simplificada)."


Comencemos por crear el QueryClient.


Sabemos que el QueryClient contiene y gestiona la caché, pero ¿qué es exactamente «una caché» y cómo se gestiona? En su forma más básica, una caché es un software que almacena datos para que el acceso futuro a ellos sea más rápido.


Dado que estamos utilizando JavaScript y queremos que la caché contenga más de un valor, podemos utilizar un Map para nuestra implementación de la caché.


Si introducimos ese Map en una clase con una forma de actualizarlo y acceder a él, ahora tenemos una forma sencilla de gestionar nuestra caché.


class QueryClient {
  constructor() {
    this.cache = new Map()
  }
  get(queryKey) {
    return this.cache.get(queryKey)
  }
  set(queryKey, data) {
    this.cache.set(queryKey, data)
  }
}


Sencillo, pero eficaz.


Si leemos desde la caché en queryKey antes de que se haya añadido un valor, obtendremos undefined, es decir, un error de caché.


const queryClient = new QueryClient()

queryClient.get('mediaDevices') // -> undefined


Pero si añadimos un valor a la caché para esa queryKey y luego lo leemos, obtendremos el valor almacenado en la caché, es decir, un acierto de caché.


const queryClient = new QueryClient()

queryClient.get('mediaDevices') // -> undefined

queryClient.set('mediaDevices', [{ deviceId: "id1", label: "label1" }])
queryClient.get('mediaDevices') // -> [{ deviceId: "id1", label: "label" }]


Es un gran comienzo, pero ahora tenemos que averiguar cómo introducir datos reales en nuestra caché, y concretamente datos que provienen de una solicitud asíncrona.


Dado que queremos que QueryClient sea independiente de los detalles de implementación de la solicitud, creemos un nuevo método, obtain, que toma una queryKey y una queryFn, y luego almacena el resultado de esa función asíncrona en la caché.


Es un gran comienzo, pero ahora tenemos que averiguar cómo introducir datos reales en nuestra caché, y concretamente datos que provienen de una solicitud asíncrona.


Dado que estamos hablando de un estado asíncrono, necesitamos una forma de generar una promesa. Nuestra implementación genérica de caché no debería saber cómo crear esa promesa, así que dejemos que acepte una función que la genere y almacene el resultado en nuestro mapa:


class QueryClient {
  constructor() {
    this.cache = new Map()
  }
  get(queryKey) {
    return this.cache.get(queryKey)
  }
  set(queryKey, data) {
    this.cache.set(queryKey, data)
  }
  async obtain({ queryKey, queryFn }) {
    const data = await queryFn(queryKey)
    this.set(queryKey, data)
  }
}


Y así es como lo usaríamos:


const queryClient = new QueryClient()

await queryClient.obtain({
  queryKey: 'mediaDevices',
  queryFn: () => navigator.mediaDevices.enumerateDevices()
})

queryClient.get('mediaDevices') // -> [{ deviceId: "1", label: "label1" }]


Ahora, probablemente notaste que obtain se parece mucho a la API de useQuery con una excepción: la queryKey es un string y no un array. Arreglemos eso.

Para que las claves puedan ser arrays, necesitamos crear un "hash" de la queryKey, lo cual podemos hacer fácilmente pasándola a JSON.stringify.


function hashKey(queryKey) {
  return JSON.stringify(queryKey)
}

class QueryClient {
  constructor() {
    this.cache = new Map()
  }
  get(queryKey) {
    const hash = hashKey(queryKey)
    return this.cache.get(hash)
  }
  set(queryKey, data) {
    const hash = hashKey(queryKey)
    this.cache.set(hash, data)
  }
  async obtain({ queryKey, queryFn }) {
    const data = await queryFn(queryKey)
    this.set(queryKey, data)
  }
}

const queryClient = new QueryClient()

await queryClient.obtain({
  queryKey: ['mediaDevices'],
  queryFn: () => navigator.mediaDevices.enumerateDevices()
})


Estamos progresando, pero todavía hay una gran diferencia entre cómo se comporta useQuery y cómo hemos implementado obtain hasta ahora.

Cuando invocamos useQuery, no solo obtenemos los datos que están en la caché; lo que obtenemos es un objeto que contiene los datos, pero también otra meta información sobre la consulta, siendo la más importante el estado (status) de la misma.


const { data, status } = useQuery({
  queryKey,
  queryFn,
})



Como ya sabes, el estado puede tener tres valores:


pendiente: la consulta aún no se ha completado, así que todavía no tienes datos.
éxito: la consulta se ha completado con éxito y los datos están disponibles.
error: la consulta ha fallado y tienes un error.
Añadamos compatibilidad para cada uno de ellos, empezando por «pendiente».

Sabemos que cuando el estado es «pendiente», significa que no hay datos en la caché, y viceversa, cuando no hay datos en la caché, el estado debe ser «pendiente». Actualicemos nuestro método «get» para reflejar esta lógica.


get(queryKey) {
  const hash = hashKey(queryKey)

  if (!this.cache.has(hash)) {
    this.set(queryKey, {
      status: "pending"
    })
  }

  return this.cache.get(hash)
}


Ahora, cuando llamamos a get con una queryKey que no existe en la caché, en lugar de undefined, obtendremos un objeto con el estado establecido en pendiente.

Lo siguiente es success.
Esto es bastante sencillo. Si nuestra queryFn se resuelve correctamente, almacenaremos esos datos en la caché con el estado establecido en success.


async obtain({ queryKey, queryFn }) {
  const data = await queryFn(queryKey)
  this.set(queryKey, { status: "success", data })
}


Y si no se resuelve correctamente, estableceremos el estado como error y almacenaremos el error en la caché.


async obtain({ queryKey, queryFn }) {
  try {
    const data = await queryFn(queryKey)
    this.set(queryKey, { status: "success", data })
  } catch (error) {
    this.set(queryKey, { status: "error", error })
  }
}


Ahora, antes de continuar, hay una pequeña pero importante actualización que debemos hacer en nuestro método set. ¿Puedes detectar el error?


function hashKey(queryKey) {
  return JSON.stringify(queryKey)
}

class QueryClient {
  constructor() {
    this.cache = new Map()
  }
  get(queryKey) {
    const hash = hashKey(queryKey)

    if (!this.cache.has(hash)) {
      this.set(queryKey, {
        status: "pending"
      })
    }

    return this.cache.get(hash)
  }
  set(queryKey, data) {
    const hash = hashKey(queryKey)
    this.cache.set(hash, data)
  }
  async obtain({ queryKey, queryFn }) {
    try {
      const data = await queryFn(queryKey)
      this.set(queryKey, { status: "success", data })
    } catch (error) {
      this.set(queryKey, { status: "error", error })
    }
  }
}


En este momento, la implementación actual de set toma cualquier dato que se le pase y lo coloca en la caché en queryKey.

Es sutil, pero el error es que siempre estamos reemplazando el valor en la caché. En cambio, queremos fusionar los nuevos datos con el valor existente.

Este cambio nos permite actualizar el estado de la consulta, mientras mantenemos los datos intactos.


set(queryKey, query) {
  const hash = hashKey(queryKey)
  this.cache.set(hash, { ...this.cache.get(hash), ...query })
}



Ahora que tenemos la interfaz intacta, el siguiente aspecto que debemos resolver es la integración con React. En concreto, ¿cómo obtenemos los datos de nuestra caché en un componente React y cómo volvemos a renderizar el componente React cada vez que cambian los datos?

Este es precisamente el problema que resuelve Observer, pero para ello, Observer necesita una forma de escuchar las actualizaciones que se producen en QueryCache.

Para ello, QueryClient debe mantener una lista de oyentes y notificarles cada vez que se llama a la función set.


function hashKey(queryKey) {
  return JSON.stringify(queryKey)
}

class QueryClient {
  constructor() {
    this.cache = new Map()
    this.listeners = new Set()
  }
  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  get(queryKey) {
    const hash = hashKey(queryKey)

    if (!this.cache.has(hash)) {
      this.set(queryKey, {
        status: "pending"
      })
    }

    return this.cache.get(hash)
  }
  set(queryKey, query) {
    const hash = hashKey(queryKey)
    this.cache.set(hash, { ...this.cache.get(hash), ...query })
    this.listeners.forEach((listener) => listener(queryKey))
  }
  async obtain({ queryKey, queryFn }) {
    try {
      const data = await queryFn(queryKey)
      this.set(queryKey, { status: "success", data })
    } catch (error) {
      this.set(queryKey, { status: "error", error })
    }
  }
}


Ahora, cada vez que se llama a subscribe, añadimos la devolución de llamada del oyente a la matriz de oyentes. A partir de ahí, cada vez que se llama a set, iteramos sobre todos los oyentes, invocándolos con queryKey para que cada uno sepa qué consulta se ha actualizado.


Cuando un consumidor necesita darse de baja, todo lo que tiene que hacer es invocar la función que devolvió subscribe.


Esta implementación es rudimentaria, pero funciona. Sin embargo, el mayor problema es que ahora estamos informando a todos los listeners sobre cada cambio en la caché. Eso no es muy eficiente.


Conceptualmente, esto está bien. Es posible que tengamos listeners que estén interesados en cada actualización de la caché. Sin embargo, cuando se combina con marcos como React, que se actualizan con bastante frecuencia, esto puede resultar costoso y adolece del mismo problema que React Context: volver a renderizar todo cuando cambia algo.


Aquí es donde los observadores pueden ayudarnos. Los observadores son la pieza que faltaba entre nuestros componentes React y las consultas en la caché.


En cierto modo, se pueden considerar como un middleware que permite a los componentes React suscribirse a entradas individuales en la caché, en una queryKey específica.


En realidad, son solo objetos con un par de métodos: subscribe y getSnapshot.


function createObserver(queryClient, options) {
  return {
    subscribe(notify) {
      const unsubscribe = queryClient.subscribe((queryKey) => {
        if (hashKey(options.queryKey) === hashKey(queryKey)) {
          notify()
        }
      })

      queryClient.obtain(options)

      return unsubscribe
    },
    getSnapshot() {
      return queryClient.get(options.queryKey)
    }
  }
}



Una vez más, lo único que hace un Observer es ayudar a los componentes React a suscribirse a entradas individuales en la caché y recibir notificaciones cuando cambian, como se puede ver en el código.

Ahora estamos listos para añadir nuestros bits React. Lo haremos de dos maneras, con un componente QueryClientProvider y un hook useQuery.

Empecemos con QueryClientProvider.

El objetivo de QueryClientProvider es hacer que QueryClient esté disponible en cualquier parte del árbol de componentes. Este es el caso de uso perfecto para React Context.

Primero crearemos QueryClientContext con React.createContext():


const QueryClientContext = React.createContext()


A continuación, podemos utilizar ese contexto para crear el componente QueryClientProvider, pasando el cliente como la propiedad value a QueryClientContext.Provider, de modo que podamos acceder a él desde cualquier lugar mediante React.useContext(QueryClientContext).


const QueryClientContext = React.createContext()

function QueryClientProvider({ client, children }) {
  return (
    <QueryClientContext.Provider value={client}>
      {children}
    </QueryClientContext.Provider>
  )
}


Ahora, utilizando nuestra función createObserver, vamos a crear el hook useQuery.

Todo lo que este hook tiene que hacer es utilizar createObserver para suscribirse a una queryKey específica en la caché y volver a renderizar cada vez que cambie.

Este es el caso de uso perfecto para el hook useSyncExternalStore de React. https://react.dev/reference/react/useSyncExternalStore

"useSyncExternalStore: Si tienes experiencia con React (y específicamente con useSyncExternalStore), el siguiente paso te resultará sencillo. Si no es así, puede que te resulte complicado (y deberías echar un vistazo a react.gg).


Si nunca lo has utilizado, useSyncExternalStore te permite suscribirte a un estado que se gestiona fuera de React (como es el caso de nuestra caché) y activar un nuevo renderizado cada vez que ese estado cambia.


Una vez más, justo lo que necesitamos.


Funciona tomando dos argumentos, subscribe y getSnapshot, y lo que devuelve es el estado actual de los datos en el almacén.


const store = React.useSyncExternalStore(
  subscribe, 
  getSnapshot
);


La parte complicada, como verás, es que el método subscribe necesita ser referencialmente estable a través de los renders. De lo contrario, subscribe se llamará en cada renderizado, lo cual obviamente no es lo que queremos.

Si te preguntas cómo funciona esto, la clave es que cuando useSyncExternalStore llama a la función de callback subscribe que le das, le pasará una función de callback (a la que llamamos notify arriba).

Cuando esa función de callback es invocada, React entonces invocará la función getSnapshot, comparará el resultado de esa invocación con el del renderizado anterior y, si cambió, volverá a renderizar el componente.

Convenientemente, hemos estructurado el objeto que se devuelve de createObserver para que coincida con los argumentos que useSyncExternalStore espera, por lo que esta primera parte es simple."

Para mayor comodidad, hemos estructurado el objeto que devuelve createObserver para que coincida con los argumentos que espera useSyncExternalStore, por lo que esta primera parte es sencilla.


function useQuery(options) {
  const queryClient = React.useContext(QueryClientContext)
  const observer = createObserver(queryClient, options)

  return React.useSyncExternalStore(
    observer.subscribe,
    observer.getSnapshot
  )
}


La única advertencia aquí es que createObserver se llama en cada renderizado. Para solucionar esto, podemos guardarlo dentro de una ref y llamarlo solo una vez, en el renderizado inicial.


function useQuery(options) {
  const queryClient = React.useContext(QueryClientContext)
  const observerRef = React.useRef()

  if (!observerRef.current) {
    observerRef.current = createObserver(queryClient, options)
  }

  return React.useSyncExternalStore(
    observerRef.current.subscribe,
    observerRef.current.getSnapshot
  )
}


esa queryKey, el Observer notificará al componente React y activará una nueva renderización.


Y eso es todo: ahora tenemos una versión mini de React Query totalmente funcional.


Como prueba de concepto, tomemos la aplicación Media Devices que viste anteriormente en el curso y sustituyamos React Query por nuestra implementación casera.

mini-react-query.js:
import * as React from 'react'

function hashKey(queryKey) {
  return JSON.stringify(queryKey)
}

export class QueryClient {
  constructor() {
    this.cache = new Map()
    this.listeners = new Set()
  }
  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  get(queryKey) {
    const hash = hashKey(queryKey)

    if (!this.cache.has(hash)) {
      this.set(queryKey, {
        status: "pending"
      })
    }

    return this.cache.get(hash)
  }
  set(queryKey, query) {
    const hash = hashKey(queryKey)
    this.cache.set(hash, { ...this.cache.get(hash), ...query })
    this.listeners.forEach((listener) => {
      listener(queryKey)
    })
  }
  async obtain({ queryKey, queryFn }) {
    try {
      const data = await queryFn(queryKey)
      this.set(queryKey, { status: "success", data })
    } catch (error) {
      this.set(queryKey, { status: "error", error })
    }
  }
}

function createObserver(queryClient, options) {
  return {
    subscribe(notify) {
      const unsubscribe = queryClient.subscribe((queryKey) => {
        if (hashKey(options.queryKey) === hashKey(queryKey)) {
          notify()
        }
      })

      queryClient.obtain(options)

      return unsubscribe
    },
    getSnapshot() {
      return queryClient.get(options.queryKey)
    }
  }
}

export function useQuery(options) {
  const queryClient = React.useContext(QueryClientContext)
  const observerRef = React.useRef()

  if (!observerRef.current) {
    observerRef.current = createObserver(queryClient, options)
  }

  return React.useSyncExternalStore(
    observerRef.current.subscribe,
    observerRef.current.getSnapshot
  )
}

const QueryClientContext = React.createContext()

export function QueryClientProvider({ client, children }) {
  return (
    <QueryClientContext.Provider value={client}>
      {children}
    </QueryClientContext.Provider>
  )
}

utils.js:
export const sleepToShowLoadingStates = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

App.js:
import * as React from "react"
import { sleepToShowLoadingStates } from './utils'
import { QueryClient, QueryClientProvider, useQuery } from './mini-react-query'

function useMediaDevices() {
  return useQuery({
    queryKey: ['mediaDevices'],
    queryFn: async () => {
      await sleepToShowLoadingStates(500)
      return navigator.mediaDevices.enumerateDevices()
    }
  })
}

function MediaDevices() {
  const { data, status } = useMediaDevices()

  if (status === 'pending') {
    return <div>loading...</div>
  }
  if (status === 'error') {
    return <div>We were unable to access your media devices</div>
  }

  return (
    <div>You have { data.length } media devices</div>
  )
}

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MediaDevices />
    </QueryClientProvider>
  )
}



¡Funciona! Hemos implementado con éxito:


✅ una clase QueryClient que almacena la caché y realiza un seguimiento de los oyentes
✅ un QueryClientProvider que distribuye el cliente entre los componentes React
✅ un hook useQuery que crea un Observer y vuelve a renderizar el componente cuando se producen actualizaciones
Ahora, para alcanzar la paridad de funciones, vamos a dar un paso más.


En este momento, si añadieras un registro a queryFn, notarías algo interesante: se llama dos veces, aunque solo tengamos un elemento MediaDevices.


¿Sabes por qué ocurre esto?


Es porque nuestra aplicación se está ejecutando en «modo estricto».

"
Modo estricto
Si no estás familiarizado con él, StrictMode es un componente que viene con React y que te permite realizar pruebas de estrés a tu aplicación en desarrollo.


import * as React from "react"
import { createRoot } from "react-dom/client"
import App from "./App.jsx"

const root = createRoot(document.getElementById("root"))

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)


Cuando tienes StrictMode «habilitado» (que es el valor predeterminado para la mayoría de las aplicaciones React), React volverá a renderizar una vez más, volverá a ejecutar los efectos una vez más y comprobará si hay API obsoletas.


¿Por qué es útil? Puedes pensar en StrictMode como una prueba de estrés de tus componentes. Si el renderizado no es puro o estás gestionando incorrectamente los efectos secundarios, StrictMode lo descubrirá (de forma agresiva).


Es controvertido, pero el objetivo general de StrictMode es hacer más evidente que estás haciendo algo mal, lo cual creo que es un objetivo razonable.


Para obtener más información al respecto, consulta la documentación oficial.

https://react.dev/reference/react/StrictMode

"


Aunque StrictMode solo es aplicable al desarrollo, sigue poniendo de manifiesto un importante fallo en nuestra implementación: no tenemos ninguna deduplicación.


Podemos verlo si desactivamos StrictMode y creamos dos elementos MediaDevices.



La función queryFn sigue siendo llamada para cada elemento MediaDevices que creamos (dos).


En cambio, con la deduplicación, independientemente del número de veces que se llame a useQuery con la misma queryKey, si ya hay una queryFn ejecutándose para esa queryKey, no tiene sentido volver a llamarla.


Para resolver esto, volvamos al terreno de JavaScript y actualicemos el método obtain de nuestra clase QueryClient por última vez.

dentro del Class QueryClient:
  async obtain({ queryKey, queryFn }) {
    try {
      if (!this.get(queryKey).promise) {
        const promise = queryFn()
        this.set(queryKey, { promise })
        const data = await promise
        this.set(queryKey, { 
          status: "success", data, promise: undefined
        })
      }
    } catch (error) {
      this.set(queryKey, { 
        status: "error", error, promise: undefined 
      })
    }
  }



Ahora, independientemente de StrictMode o del número de elementos MediaDevices que creemos, si ya existe una queryFn activa para una queryKey determinada, nuestra implementación es lo suficientemente inteligente como para no volver a llamarla.


Y con eso, tenemos una reimplementación mínima y totalmente funcional de React Query, incluida la deduplicación, en solo unas 80 líneas de código.


Por supuesto, el React Query adecuado viene con toda una serie de características que nuestra mini reimplementación no tiene, pero ahora deberías tener una sólida comprensión de cómo funcionan juntos QueryClient, QueryClientProvider, useQuery y Observers.
