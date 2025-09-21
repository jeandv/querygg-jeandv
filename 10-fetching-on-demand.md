## Fetching on Demand

En este punto, has visto algunos ejemplos de cómo React Query puede tomar código asíncrono e imperativo y hacer que parezca sincrónico al ponerlo detrás de una API declarativa. Sin embargo, todos esos ejemplos tenían una cosa en común: todos obtenían sus datos inmediatamente cuando el componente se montaba.

Normalmente esto es lo que quieres, pero hay muchas razones por las que podría ser una buena idea retrasar esa petición inicial.

Por ejemplo, ¿qué pasaría si necesitáramos obtener primero alguna entrada del usuario para poder hacer la petición? ¿Cómo se vería exactamente eso usando useQuery?

Si extendemos este experimento mental a nuestra aplicación de "Issues" de GitHub añadiendo una barra de búsqueda, un enfoque podría ser este.


const [search, setSearch] = React.useState('')

if (search) {
  return useQuery({
    queryKey: ['issues', search],
    queryFn: () => fetchIssues(search),
  })
}


Este código parece perfectamente razonable. Desafortunadamente, React ni siquiera te permitirá hacerlo porque viola las reglas de los hooks. Específicamente, no puedes llamar a los hooks de forma condicional, como estamos haciendo en nuestra sentencia if.

En su lugar, React Query ofrece otra opción de configuración a través de su propiedad enabled.

enabled te permite pasar un valor booleano a useQuery que determina si la función de la consulta debe ejecutarse o no.

En nuestro caso, enabled nos permite decirle a React Query que solo queremos ejecutar la queryFn cuando tenemos un término de búsqueda.

https://react.dev/reference/rules/rules-of-hooks


function useIssues(search) {
  return useQuery({
    queryKey: ['issues', search],
    queryFn: () =>  fetchIssues(search),
    enabled: search !== ''
  })
}


Y si lo incorporáramos a una aplicación real, así es como se vería.


App.js:
import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import Search from "./Search"
import { fetchIssues } from "./api"

function useIssues(search) {
  return useQuery({
    queryKey: ['issues', search],
    queryFn: () =>  fetchIssues(search),
    enabled: search !== ''
  })
}

function IssueList ({ search }) {
  const { data, status } = useIssues(search)

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>There was an error fetching the issues</div>
  }

  return (
    <p>
      <ul>
        {data.items.map((issue) => 
          <li key={issue.id}>{issue.title}</li>
        )}
      </ul>
    </p>
  )
}

export default function App() {
  const [search, setSearch] = React.useState('')

  return (
    <div>
      <Search onSubmit={(s) => setSearch(s)} />
      <IssueList search={search} />
    </div>
  )
}

Search.js:
export default function Search({ onSubmit }) {
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit(e.target.elements.search.value);
    }}>
      <label>Search:
        <input
          type="text"
          name="search"
          placeholder="e.g. useQuery"
        />
      </label>
    </form>
  )
}

api.js:
export async function fetchIssues(search) {
  const searchParams = new URLSearchParams()
  searchParams.append('q', `${search} is:issue repo:TanStack/query`)
  const url = `https://api.github.com/search/issues?${searchParams}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('fetch failed')
  }

  return response.json()
}


Pues eso no es lo ideal.

Fíjate que antes de que un usuario siquiera escriba en el campo de entrada, ya está viendo el indicador de carga .... ¿Por qué pasa eso?

Recuerda, una consulta solo puede estar en uno de tres estados: pending, success o error.

success significa que hay datos disponibles en la caché.

error significa que hubo un error al intentar obtener los datos para ponerlos en la caché.

pending significa literalmente cualquier otra cosa.

En este momento, para mostrar nuestro indicador de carga, estamos verificando si la consulta se encuentra en un estado pending.


if (status === 'pending') {
  return <div>...</div>
}


Pero de nuevo, pending solo nos dice que no hay datos disponibles en la caché y que no hubo un error al obtener esos datos. No nos dice si la consulta se está obteniendo en este momento, como estamos asumiendo al tratarlo como el condicional para nuestro indicador de carga.

Lo que realmente necesitamos es una forma de saber si la queryFn se está ejecutando actualmente. Si es así, eso nos ayudará a determinar si debemos mostrar o no el indicador de carga.

Afortunadamente, React Query expone esto a través de una propiedad fetchStatus en el objeto de la consulta.


const { data, status, fetchStatus } = useIssues(search)


Cuando fetchStatus es fetching, la queryFn se está ejecutando.

Podemos usar esto, junto con el status de la consulta, para deducir con mayor precisión cuándo debemos mostrar el indicador de carga.


const { data, status, fetchStatus } = useIssues(search)

if (status === 'pending') {
  if (fetchStatus === 'fetching') {
    return <div>...</div>
  }
}


Esto tiene sentido. Si el status es pending, significa que no hay datos disponibles en la caché. Si el fetchStatus es fetching, significa que la queryFn se está ejecutando actualmente. Si no hay datos en la caché y la queryFn se está ejecutando actualmente, deberíamos mostrar el indicador de carga.

- isFetching:

Para aquellos que odian escribir, también pueden usar el valor derivado isFetching que devuelve useQuery, que es equivalente a fetchStatus === 'fetching'.


const { data, status, isFetching } = useIssues(search)

if (status === 'pending') {
  if (isFetching) {
    return <div>...</div>
  }
}


De hecho, este patrón es tan común que React Query proporciona un valor derivado, llamado acertadamente isLoading, que es un atajo para el código anterior.


const { data, status, isLoading } = useIssues(search)

if (isLoading) {
  return <div>...</div>
}


Entonces, si lo incorporamos a nuestra aplicación, estaremos listos, ¿verdad?


App.js:
import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import Search from "./Search"
import { fetchIssues } from "./api"

function useIssues(search) {
  return useQuery({
    queryKey: ['issues', search],
    queryFn: () =>  fetchIssues(search),
    enabled: search !== ''
  })
}

function IssueList ({ search }) {
  const { data, status, isLoading } = useIssues(search)

  if (isLoading) {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>There was an error fetching the issues</div>
  }

  return (
    <p>
      <ul>
        {data.items.map((issue) => 
          <li key={issue.id}>{issue.title}</li>
        )}
      </ul>
    </p>
  )
}

export default function App() {
  const [search, setSearch] = React.useState('')

  return (
    <div>
      <Search onSubmit={(s) => setSearch(s)} />
      <IssueList search={search} />
    </div>
  )
}


Lamentablemente, no del todo. Tal como está, obtenemos este error:


Cannot read properties of undefined (reading 'items')


Este es otro buen momento para hacer una pausa e intentar descubrir por qué sucede esto. Hay otro momento ¡Ajá! esperándote al final de tu recorrido.

La razón por la que esto sucede es porque estamos asumiendo que si isLoading es false y el status no es error, entonces tenemos data. Lamentablemente, esa es una suposición incorrecta.

Recuerda, isLoading solo nos dice si el status es pending y el fetchStatus es fetching. Si lo desglosamos aún más, un status pending significa que no hay datos en la caché, y un fetchStatus fetching significa que la queryFn se está ejecutando en este momento.

Entonces, ¿qué sucede en el escenario donde el status es pending porque no hay datos en la caché, y el fetchStatus no es fetching porque la queryFn no se está ejecutando actualmente? En este escenario, isLoading será false.

De hecho, este es exactamente el escenario en el que nos encontramos.

Lidiar con este tipo de acertijos lógicos siempre es un poco complicado, así que aquí hay algo de código que representa exactamente lo que está sucediendo en nuestra aplicación para ayudarte.


const data = undefined // There's no data in the cache
const status = "pending" // There's no data in the cache
const fetchStatus = "idle" // The queryFn isn't currently being executed
const isLoading = status === "pending" && fetchStatus === "fetching" // false

if (isLoading) {
  return <div>...</div>
}

if (status === 'error') {
  return <div>There was an error fetching the issues</div>
}

return (
  <p>
    <ul>
      {data.items.map((issue) => 
        <li key={issue.id}>{issue.title}</li>
      )}
    </ul>
  </p>
)


¿Puedes ver el problema ahora?

Hay dos escenarios que no estamos considerando, y ambos están representados por el código de arriba. El primero es el escenario en el que nuestra queryFn no está enabled (habilitada) porque no tenemos un término de búsqueda, y el segundo es el escenario en el que nuestra petición a la API no devuelve datos.

La solución para ambos es nunca asumir que tenemos data sin antes verificar explícitamente si el status de la consulta es success. De nuevo, un status de success significa que hay datos en la caché.


App.js:
import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import Search from "./Search"
import { fetchIssues } from "./api"

function useIssues(search) {
  return useQuery({
    queryKey: ['issues', search],
    queryFn: () =>  fetchIssues(search),
    enabled: search !== ''
  })
}

function IssueList ({ search }) {
  const { data, status, isLoading } = useIssues(search)

  if (isLoading) {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>There was an error fetching the issues</div>
  }

  if (status === "success") { // aqui esta la correción!
    return (
      <p>
        <ul>
          {data.items.map((issue) => 
            <li key={issue.id}>{issue.title}</li>
          )}
        </ul>
      </p>
    )
  }

  return <div>Please enter a search term</div>
}

export default function App() {
  const [search, setSearch] = React.useState('')

  return (
    <div>
      <Search onSubmit={(s) => setSearch(s)} />
      <IssueList search={search} />
    </div>
  )
}


Al verificar explícitamente el status de la consulta en busca de success, podemos estar seguros de que hay data en la caché a la que podemos acceder de forma segura.

Y por última vez, para aquellos que se enredan un poco con acertijos lógicos como este (yo incluido), aquí está nuestro componente IssueList con comentarios para ayudar a consolidar exactamente lo que está sucediendo.


function IssueList ({ search }) {
  const { data, status, isLoading } = useIssues(search)

  if (isLoading) {
    // there is no data in the cache 
    // and the queryFn is currently being executed
    return <div>...</div>
  }

  if (status === 'error') {
    // there was an error fetching the data to put in the cache
    return <div>There was an error fetching the issues</div>
  }

  if (status === "success") {
    // there is data in the cache
    return (
      <p>
        <ul>
          {data.items.map((issue) => 
            <li key={issue.id}>{issue.title}</li>
          )}
        </ul>
      </p>
    )
  }

  // otherwise
  return <div>Please enter a search term</div>
}


- Para usuarios de TypeScript:

La opción enabled no realiza ninguna reducción de tipo (type narrowing) por sí misma. Aquí, obtendremos un error de tipo al intentar llamar a fetchIssue porque estamos tratando de asignar un tipo number | undefined donde se espera un number:


import { useQuery } from '@tanstack/react-query'

declare function fetchIssue(id: number): Promise<any>

function useIssue(id: number | undefined) {
  return useQuery({
    queryKey: ['issues', id],
    queryFn: () => fetchIssue(id),
    enabled: id !== undefined
  })
}


Si no queremos usar el operador bang (!), podemos pasar un skipToken que podemos importar desde React Query en lugar del QueryFunction:

https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html#non-null-assertion-operator

import { skipToken, useQuery } from '@tanstack/react-query'

declare function fetchIssue(id: number): Promise<any>

function useIssue(id: number | undefined) {
  return useQuery({
    queryKey: ['issues', id],
    queryFn: id === undefined
      ? skipToken
      : () => fetchIssue(id)
  })
}


Cuando React Query ve el skipToken, internamente establece enabled: false. Sin embargo, TypeScript ahora reducirá correctamente el tipo de id a number en la queryFn debido a la comprobación condicional.

Puedes ver todas las variaciones en este TypeScript playground.

https://www.typescriptlang.org/play?#code/JYWwDg9gTgLgBAbzgVwM4FMCKz1QJ5wC+cAZlBCHAOQACMAhgHaoMDGA1gPRTr2swBaAI458VALAAoKTDxh0cAJKpUOOAF5EcYABMAXHEbIQAI1wAaODvSpWUYGBjAIjAy3uMA5kSlTrrABt6HlJkRn5nRlJ0GFYAC2VVdAAKXQMjU1wASgMABXIQYAwAHkScAD5fSRIwiJcUDDL0AHVgGDiAUShyKFT9Q2MzKDgAHxRGaxJgRnQdLMQpODgeGGQoKLQsUTxkhEWluBFcPABpdDwDAG0qIqSqS10AXXN9pc5OODpUAXQAD3l+D9utA4ABBKCeYzoRjwCAkOCyeTUDJDUbjSbTWZUbSoQwQeD0FTATyMegmAIKGAQOBgYL0EAxXBwOEIuQKKgo3BUAB0r0O2wAYq44Ml5upytFYgkVDg+lkXpIDnBoWSKf1dHAAITqTRhDEzHQKpaELJSQhVGrhJz1TZNVrtAByEAdyACAVBKlw1sYfXSgyZYz16CmBvme0Vyxiaw2GGwx12fKO+DOFzg11uOHu2h0z0TguFoo0EpIMXiTT6mvlfJV5NmBg12t1E2DmMN+xNZottW9DXQdranX+AWArDaAGE4ugOL6BplhoHmyHZmH9ito724-gExGlknTucrjcZegs08jQc90KDIXxdmNDr0S2DXylQB+OD5ChFdDcngAKynGBkhmAB3OAuh6ZIACJpgAN3oYcdGzKCslNHclTgAwSylctdCrdCazVeskMbR8lzbCMO0kQggA


Hay otra estrategia que puedes seguir cuando necesitas obtener datos a demanda, y no tiene nada que ver con la propiedad enabled.

De hecho, es un patrón de React que funciona con o sin React Query.

Simplemente puedes poner toda la lógica de la consulta en un componente y luego renderizarlo de forma condicional, como prefieras.


import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import Search from "./Search"
import { fetchIssues } from "./api"

function useIssues(search) {
  return useQuery({
    queryKey: ['issues', search],
    queryFn: () =>  fetchIssues(search),
  })
}

function IssueList ({ search }) {
  const { data, status } = useIssues(search)

  if (status === "pending") {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>There was an error fetching the issues</div>
  }

  return (
    <p>
      <ul>
        {data.items.map((issue) => 
          <li key={issue.id}>{issue.title}</li>
        )}
      </ul>
    </p>
  )
}

export default function App() {
  const [search, setSearch] = React.useState('')

  return (
    <div>
      <Search onSubmit={(s) => setSearch(s)} />
      {search
        ? <IssueList search={search} />
        : <div>Please enter a search term</div>}
    </div>
  )
}


Fíjate que nuestra aplicación se comporta igual, y podríamos deshacernos de la bandera enabled, así como de las verificaciones de isLoading y success en nuestro componente IssueList.

Independientemente de la opción que elijas, entender cómo obtener datos bajo demanda es una herramienta poderosa para tener en tu caja de herramientas de React Query.