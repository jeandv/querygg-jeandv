A la gente le encanta React Query porque parece la solución perfecta para gestionar el estado asíncrono del servidor. Sin embargo, para que esa solución funcione, hay que seguir primero algunos
pasos de configuración.



Afortunadamente, nuestro ejemplo de Pokémon es ideal para mostrar la configuración más sencilla, sobre la que podremos seguir trabajando a lo largo del curso a medida que aprendamos temas más avanzados.


A modo de recordatorio, aquí lo tenemos:


import * as React from "react"
import PokemonCard from "./PokemonCard"
import ButtonGroup from "./ButtonGroup"
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'

const queryClient = new QueryClient()

function App () {
  const [id, setId] = React.useState(1)
  const { data: pokemon, isLoading, error } = useQuery({
    queryKey: ['pokemon', id],
    queryFn: () => fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
      .then(res => res.json())
  })

  return (
    <>
      <PokemonCard 
        isLoading={isLoading} 
        data={pokemon} 
        error={error}
      />
      <ButtonGroup handleSetId={setId} />
    </>
  )
}

export default function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <App/>
    </QueryClientProvider>
  )
}


Lo primero que probablemente hayas notado es el nombre del paquete en sí: es @tanstack/react-query, no solo react-query.

import { ... } from '@tanstack/react-query'


Entonces, ¿qué diablos es TanStack?


Tanner Linsley, el creador de react-query, tuvo cuidado de construir la biblioteca sobre un núcleo agnóstico, lo que significa que la mayor parte de su lógica es solo JavaScript puro que no está vinculado a React en sí.


De esta forma, hizo posible utilizar (TanStack) Query con otros marcos como Vue, Solid, Svelte o Angular. Sin embargo, con todas estas bibliotecas diferentes surgiría la necesidad de adquirir también todos esos
paquetes NPM diferentes,
de ahí el espacio de nombres @tanstack.


A lo largo de este curso, seguiremos refiriéndonos a ella como «React Query» (ya que todos nuestros ejemplos estarán en el contexto de una aplicación React), pero ten en cuenta que estos conocimientos son fácilmente transferibles si en el futuro utilizas un marco diferente.

A continuación, pasamos al corazón de React Query, el QueryClient.


import { QueryClient } from '@tanstack/react-query'

...

const queryClient = new QueryClient(options)


Lo que hace que QueryClient sea tan importante es que contiene y gestiona la "QueryCache", la ubicación donde se almacenan todos los datos. Sin esa caché, la mayoría de las funciones que hacen que React Query sea tan agradable de usar no funcionarían, y es a través de QueryClient como se interactúa con la caché.

Under the Hood (funcionamiento interno)

Si te sirve de ayuda, puedes imaginarte la QueryCache como un "Map de JavaScript" en memoria, porque eso es exactamente lo que es bajo el capó (por debajo, en su funcionamiento interno).

https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map

Una cosa a tener en cuenta sobre QueryClient es que debes asegurarte de crearlo fuera de tu componente React más principal. Esto garantiza que tu caché se mantenga estable incluso cuando tu aplicación se vuelva a renderizar.


import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient()

export default function App () {
  ...
}


Sin embargo, dado que QueryClient se crea y se ubica fuera de React, necesitarás una forma de distribuirlo por toda tu aplicación para poder interactuar con él desde cualquier componente.

Esto nos lleva a la primera API específica de React que necesitarás, QueryClientProvider.


import { 
  QueryClient, 
  QueryClientProvider 
} from '@tanstack/react-query'

const queryClient = new QueryClient()

export default function App () {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  )
}


Al envolver tu componente principal dentro del componente QueryClientProvider proporcionado y pasar el queryClient como una propiedad del cliente, React Query pondrá la caché de consultas a tu disposición en cualquier parte de tu árbol de componentes.


Esto funciona porque React Query utiliza React Context en segundo plano. Sin embargo, en lugar de utilizar Context para la gestión del estado como vimos anteriormente, React Query lo utiliza únicamente para la inyección de dependencias.


El QueryClient que se pasa es un objeto estático que nunca cambia. Esto te permite acceder a la caché e interactuar con React Query donde quieras, sin tener que preocuparte por activar re-renderizaciones innecesarias.


Por supuesto, la forma principal de interactuar con la caché es a través del hook useQuery, el caballo de batalla de React Query.


En segundo plano, useQuery se suscribirá a QueryCache y volverá a renderizar cada vez que cambien los datos que le interesan en la caché.


Naturalmente, esto plantea un par de preguntas.


¿Cómo sabe qué datos le interesan?
¿Cómo sabe de dónde obtener esos datos?
La respuesta a ambas preguntas se encuentra en el objeto que recibe useQuery.


Cuando invocas useQuery, casi siempre le proporcionas dos cosas: una queryKey y una queryFn.


const { data } = useQuery({
  queryKey: ['luckyNumber'],
  queryFn: () => Promise.resolve(7),
})


De forma predeterminada, si ya hay datos ubicados en la caché en queryKey, useQuery devolverá esos datos inmediatamente.

De lo contrario, invocará queryFn, tomará los datos que la promesa devuelva desde queryFn, los colocará en la caché en queryKey y, a continuación, los devolverá.

La API es bellamente simple, pero hay algunas cosas que debes tener en cuenta.

Primero, dado que la queryKey se usará como la clave del Map en la caché, debe ser única a nivel global.

Segundo, queryFn debe devolver una promesa que se resuelva con los datos que quieres guardar en caché. Esto no es muy difícil de recordar, ya que la mayor parte del tiempo, el queryFn será una petición asíncrona (normalmente usando fetch) que devuelve una promesa por defecto, tal como vimos en nuestro ejemplo de Pokémon.


const { data: pokemon, isLoading, error } = useQuery({
  queryKey: ['pokemon', id],
  queryFn: () => fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
    .then(res => res.json())
})


Ahora que ya hemos cubierto los conceptos básicos, pasemos a lo divertido.

- EXTRA: Otra explicación mas clara de "QueryKey" y "QueryFn"

¿Cómo funcionan queryKey y queryFn?

* queryKey:

El queryKey es un identificador único para tus consultas. Funciona como la clave de un caché. TanStack Query lo usa para:

Identificar los datos en la caché: Cuando llamas a useQuery con una queryKey específica, el hook primero verifica si ya tiene datos en su caché para esa clave. Si los tiene, los devuelve instantáneamente, mejorando el rendimiento de tu aplicación.

Activar la queryFn: Si no encuentra los datos en la caché (o si los datos están desactualizados), ejecuta la queryFn para obtenerlos.

Invalidar y refetchar: Puedes usar el queryKey para invalidar datos manualmente (por ejemplo, después de una mutación) y forzar que se vuelvan a cargar.

En tu ejemplo, queryKey: ['pokemon', id] crea una clave única compuesta por dos partes: una cadena 'pokemon' (el tipo de recurso que estás consultando) y una variable id (el identificador específico del Pokémon). Esto asegura que ['pokemon', 1] sea una clave diferente de ['pokemon', 2], permitiendo a TanStack Query almacenar y gestionar cada Pokémon individualmente.

* queryFn:

El queryFn es la función que hace la petición real para obtener los datos. Es la fuente de la verdad para tu consulta.

¿Qué hace? Contiene la lógica para obtener los datos de una API, base de datos u otra fuente. En tu caso, es una función que usa fetch para llamar a la API de Pokémon.

¿Qué debe devolver? Siempre debe devolver una promesa que se resuelva con los datos que quieres guardar en caché. Si la promesa se rechaza (por ejemplo, un error de red), TanStack Query lo detecta y establece el estado error.

Relación con queryKey: queryFn solo se ejecutará cuando sea necesario, es decir, cuando no haya datos en la caché para la queryKey o cuando se solicite una recarga. Esto optimiza las peticiones de red y la experiencia del usuario.

En resumen, queryKey le dice a TanStack Query qué datos estás buscando, y queryFn le dice cómo ir a buscarlos.