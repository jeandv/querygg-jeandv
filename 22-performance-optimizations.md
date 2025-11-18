## Performance Optimizations

Si has estado construyendo aplicaciones React por un tiempo, puede que hayas experimentado este escenario.

Tu aplicación está progresando bien, cuando de repente lo notas: un problema de rendering (renderizado). Nada grave, solo algunos tartamudeos aquí y allá.

Así que haces lo que cualquier buen desarrollador haría: lo ignoras y esperas lo mejor — no, abres las React DevTools y notas que uno de tus componentes se está renderizando con mucha más frecuencia de lo que debería. Esto no siempre es un problema, pero en esta aplicación en particular tienes algunos componentes hijos costosos, lo cual se nota.

Aunque generalmente es una buena idea encontrar formas de hacer que los componentes se rendericen más rápido en lugar de menos — a veces, es inevitable.

Afortunadamente, React en sí mismo nos ofrece algunas opciones para resolver estos problemas — y para asegurarnos de que estamos en sintonía, hagamos un repaso rápido de algunos fundamentos de renderizado de React.

Cuando se trata de renderizado, la forma en que funciona React es que cada vez que cambia el estado, volverá a renderizar el componente que posee ese estado y todos sus componentes hijos, independientemente de si esos componentes hijos aceptan o no alguna prop (propiedad).

Podemos ver esto en acción con esta aplicación básica. Observa que cada vez que haces clic en el botón, aunque el componente Wave no dependa de ninguna prop, aún se vuelve a renderizar (re-renderiza).


import * as React from "react"

function Wave () {
  console.count("Rendering Wave")
  return (
    <span role="img" aria-label="hand waving">
      👋
    </span>
  )
}

export default Wave


import * as React from "react"
import Wave from "./Wave"

function Greeting ({ name }) {
  const [index, setIndex] = React.useState(0)

  const greetings = ['Hello', "Hola", "Bonjour"]

  const handleClick = () => {
    const nextIndex = index === greetings.length - 1
      ? 0
      : index + 1
    setIndex(nextIndex)
  }

  return (
    <main>
      <h1>{greetings[index]}, {name}</h1>
      <button onClick={handleClick}>
        Next Greeting
      </button>
      <Wave />
    </main>
  )
}

export default function App () {
  return <Greeting name="Tyler" />
}


Para evitar este comportamiento por defecto y hacer que un componente solo se vuelva a renderizar cuando sus props cambian realmente, puedes usar el Componente de Orden Superior (Higher-Order Component o HOC) de React llamado React.memo.


import * as React from "react"

function Wave () {
  console.count("Rendering Wave")
  return (
    <span role="img" aria-label="hand waving">
      👋
    </span>
  )
}

export default React.memo(Wave) // AQUI EL CAMBIO


Ahora, sin importar cuántas veces hagamos clic en nuestro botón, Wave solo se renderizará una vez, en el renderizado inicial.

Pero, ¿qué sucede si hacemos que nuestro componente Wave sea un poco más configurable?

En lugar de no recibir props, vamos a pasarle una prop options que podemos usar para configurar el emoji. Específicamente, permitiremos que el consumidor de Wave pueda configurar el tono de piel del emoji, así como si está animado.


<Wave 
  options={{ animate: true, tone: 4 }} 
  onClick={handleWaveClick}  
/>


Y si refactorizamos nuestra aplicación, así es como se comporta.

App.jsx:
import * as React from "react"
import Wave from "./Wave"

function Greeting ({ name }) {
  const [index, setIndex] = React.useState(0)
  const [waveIndex, setWaveIndex] = React.useState(0)

  const greetings = ['Hello', "Hola", "Bonjour"]

  const handleClick = () => {
    const nextIndex = index === greetings.length - 1
      ? 0
      : index + 1
    setIndex(nextIndex)
  }

  const handleWaveClick = () => {
    const nextIndex = waveIndex === 5
      ? 0
      : waveIndex + 1
    setWaveIndex(nextIndex)
  }

  const options = {
    animate: true,
    tone: waveIndex
  }

  return (
    <main>
      <h1>{greetings[index]}, {name}</h1>
      <button onClick={handleClick}>
        Next Greeting
      </button>
      <Wave onClick={handleWaveClick} options={options} />
    </main>
  )
}

export default function App () {
  return <Greeting name="Tyler" />
}

Wave.jsx
import * as React from "react"

const toneMap = {
  0: '👋',
  1: '👋🏻',
  2: '👋🏼',
  3: '👋🏽',
  4: '👋🏾',
  5: '👋🏿',
}

function Wave ({ onClick, options }) {
  console.count("Rendering Wave")
  return (
    <button 
      onClick={onClick}
      className={options.animate ? "wave" : null} role="img" 
      aria-label="hand waving"
    >
      {toneMap[options.tone || 0]}
    </button>
  )
}

export default React.memo(Wave)


¡Eso funciona genial! Pero, ¿puedes identificar el problema ahora? Cambia el saludo (greeting) y mira qué pasa. A pesar de que estamos usando React.memo, nuestro componente Wave ha vuelto a renderizarse cada vez que el índice cambia, aunque no dependa en absoluto del índice.

¿Puedes descubrir por qué sucede esto? Aquí tienes una pista: tiene que ver con la igualdad referencial (referential equality).

La forma en que funciona React.memo es que solo volverá a renderizar el componente cuando sus props cambien. Pero eso plantea una pregunta interesante: ¿cómo determina exactamente React si las props han cambiado? Simple: con el operador de identidad ===.

La forma en que funciona nuestro componente Wave es que le estamos pasando dos props: options y onClick. Ambas son valores de referencia (objetos o funciones).


<Wave 
  options={{ animate: true, tone: 4 }} 
  onClick={handleWaveClick}  
/>


Debido a que los valores de referencia se comparan por su ubicación en la memoria, aunque la función parezca la misma y las propiedades en el objeto sigan siendo idénticas, técnicamente estamos creando y pasando un objeto y una función completamente nuevos en cada renderizado. Esto anula los beneficios de React.memo.

Entonces, ¿cómo solucionamos esto? Bueno, necesitamos encontrar una manera de que los valores que pasamos como props sean referencialmente consistentes a través de los renderizados.

Afortunadamente, React nos proporciona algunos hooks para esto: useMemo y useCallback.

En pocas palabras, useMemo te permite almacenar en caché el resultado de un cálculo entre renderizados, y useCallback te permite almacenar en caché la función en sí, manteniendo ambos estables referencialmente.

Para memorizar nuestro objeto de opciones, podemos hacer algo como esto.


const options = React.useMemo(() => {
  return {
    animate: true,
    tone: waveIndex
  }
}, [waveIndex])


Y para memorizar nuestra función handleWaveClick, podemos hacer algo como esto.


const handleWaveClick = React.useCallback(() => {
  setWaveIndex((i) => {
    return i === 5 ? 0 : i + 1
  })
}, [])


Y si introducimos ambos (hooks) en nuestra aplicación, podemos ver que nuestro componente Wave ha vuelto a renderizarse solo cuando cambia.


App.jsx
import * as React from "react"
import Wave from "./Wave"

function Greeting ({ name }) {
  const [index, setIndex] = React.useState(0)
  const [waveIndex, setWaveIndex] = React.useState(0)

  const greetings = ['Hello', "Hola", "Bonjour"]

  const handleClick = () => {
    const nextIndex = index === greetings.length - 1
      ? 0
      : index + 1
    setIndex(nextIndex)
  }

  const handleWaveClick = React.useCallback(() => {
    setWaveIndex((i) => {
      return i === 5 ? 0 : i + 1
    })
  }, [])

  const options = React.useMemo(() => {
    return {
      animate: true,
      tone: waveIndex
    }
  }, [waveIndex])

  return (
    <main>
      <h1>{greetings[index]}, {name}</h1>
      <button onClick={handleClick}>
        Next Greeting
      </button>
      <Wave onClick={handleWaveClick} options={options} />
    </main>
  )
}

export default function App () {
  return <Greeting name="Tyler" />
}



Wave.jsx
import * as React from "react"

const toneMap = {
  0: '👋',
  1: '👋🏻',
  2: '👋🏼',
  3: '👋🏽',
  4: '👋🏾',
  5: '👋🏿',
}

function Wave ({ onClick, options }) {
  console.count("Rendering Wave")
  return (
    <button 
      onClick={onClick}
      className={options.animate ? "wave" : null} role="img" 
      aria-label="hand waving"
    >
      {toneMap[options.tone || 0]}
    </button>
  )
}

export default React.memo(Wave)


Bien, ¿qué tiene que ver todo esto con React Query?

Si lo piensas, ¿no debería ser esto un problema enorme para React Query?

Cada vez que llamas a useQuery, obtienes un objeto completamente nuevo (un valor de referencia). A menos que React Query memoice ese valor y envuelvas tus componentes en React.memo, básicamente todo tu árbol de componentes se volvería a renderizar cada vez que se ejecute una Query, lo cual, como hemos visto, es muy frecuente.

Obviamente, si este fuera el caso, React Query sería casi irrelevante. Entonces, ¿cómo se resuelve esto? De dos maneras: Compartición Estructural (Structural Sharing) y Observadores (Observers).

1. Compartición Estructural (Structural Sharing)
Cada vez que se ejecuta una query y se invoca la función queryFn, casi siempre devolverás a React Query un objeto nuevo (generalmente a través de res.json()).

Sin embargo, en lugar de poner ese objeto en la caché de query inmediatamente y luego devolverlo como data, React Query primero verifica si alguna de las propiedades y valores del objeto han cambiado realmente.

Si han cambiado: React Query crea un nuevo objeto data y te lo entrega.

Si NO han cambiado: En lugar de crear un objeto nuevo o reutilizar el que le diste, React Query simplemente reutilizará el mismo objeto de antes, manteniendo la referencia idéntica.

Esta optimización te permite usar el objeto data con React.memo o incluirlo en el array de dependencias para useEffect o useMemo sin preocuparte por efectos o cálculos innecesarios.

2. Observadores (Observers)
Sin embargo, esto es solo la mitad de la ecuación. Como vimos antes, incluso con la compartición estructural, aún necesitarías envolver tus componentes en React.memo para evitar que se vuelvan a renderizar cada vez que se ejecuta una Query.

Aquí es donde entran los Observadores.

Los Observadores son el pegamento entre la Caché de Query y cualquier componente de React, y viven fuera del árbol de componentes de React.

Esto significa que cuando una queryFn se vuelve a ejecutar y la caché de Query se actualiza, en ese momento, el Observador puede decidir si informar o no al componente de React sobre ese cambio.

Podemos ver esto en acción con un ejemplo simple.


import { useQuery } from '@tanstack/react-query'

export default function App() {
  const { data, refetch } = useQuery({
    queryKey: ['user'],
    queryFn: () => {
      console.log('queryFn runs')
      return Promise.resolve({
        name: 'Dominik',
      })
    }
  })

  console.log('render')

  return (
    <div>
      <button onClick={() => refetch()}>
        refresh
      </button>
      <p>
        {data?.name}
      </p>
    </div>
  )
}


Observa que a pesar de que nuestra queryFn se ejecuta cada vez que invocamos manualmente refetch, debido a que los datos no han cambiado, el Observador es lo suficientemente inteligente como para saber que el componente no necesita volverse a renderizar.

Podemos ver esto representado en estas dos imágenes: la primera donde los datos no han cambiado y la segunda donde sí lo han hecho.

Ahora, aquí tienes una pregunta en la que quiero que reflexiones. ¿Qué crees que sucederá si añadimos una nueva propiedad al objeto que devuelve la queryFn, pero esta propiedad 1) cambia cada vez que se invoca queryFn, pero 2) no es utilizada por el componente?

En cierto sentido, te estoy preguntando qué tan inteligente crees que es realmente el Observador.


queryFn: () => {
  console.log('queryFn runs')
  return Promise.resolve({
    name: 'Dominik',
    updatedAt: Date.now()
  })
}


¿Es lo suficientemente inteligente como para saber que el componente no necesita volver a renderizarse ya que no usa la propiedad updatedAt?

Pruébalo.


import { useQuery } from '@tanstack/react-query'

export default function App() {
  const { data, refetch } = useQuery({
    queryKey: ['user'],
    queryFn: () => {
      console.log('queryFn runs')
      return Promise.resolve({
        name: 'Dominik',
        updatedAt: Date.now()
      })
    }
  })

  console.log('render')

  return (
    <div>
      <button onClick={() => refetch()}>
        refresh
      </button>
      <p>
        {data?.name}
      </p>
    </div>
  )
}


Aunque el Observador es lo suficientemente inteligente como para saber que no necesita volver a renderizar el componente cuando sus datos no cambian, no es lo suficientemente inteligente como para saber qué datos utiliza realmente el componente.

Afortunadamente, con un poco de nuestra ayuda, podemos hacer que el Observador sea un poco más inteligente.

Si tu queryFn devuelve datos extra que no son necesarios en el componente, puedes usar la opción select para filtrar los datos que el componente no necesita y, por lo tanto, suscribirse a un subconjunto de los datos y solo volver a renderizar el componente cuando sea necesario.

Funciona aceptando los datos devueltos de la queryFn, y el valor que devuelve será pasado al componente.


const { data, refetch } = useQuery({
  queryKey: ['user'],
  queryFn: () => {
    console.log('queryFn runs')
    return Promise.resolve({
      name: 'Dominik',
      updatedAt: Date.now()
    })
  },
  select: (data) => ({ name: data.name })
})


Ahora, si lo incorporamos a nuestra aplicación, fíjate en cómo se comporta.


import { useQuery } from '@tanstack/react-query'

export default function App() {
  const { data, refetch } = useQuery({
    queryKey: ['user'],
    queryFn: () => {
      console.log('queryFn runs')
      return Promise.resolve({
        name: 'Dominik',
        updatedAt: Date.now()
      })
    },
    select: (data) => ({ name: data.name })
  })

  console.log('render')

  return (
    <div>
      <button onClick={() => refetch()}>
        refresh
      </button>
      <p>
        {data?.name}
      </p>
    </div>
  )
}


A pesar de que la propiedad updatedAt cambia cada vez que se ejecuta la queryFn, el componente ya no se vuelve a renderizar puesto que hemos filtrado ese valor utilizando select.

Una vez más, todo esto funciona porque el Observador está desacoplado del componente y, por lo tanto, puede tomar decisiones de renderizado de alto nivel.

Y quizás también hayas notado que la igualdad referencial es irrelevante para select. Como le concierne a React Query, lo que importa es el contenido de los datos, no su referencia.


- Para Usuarios de TypeScript:

El tipo de data se deriva de lo que devuelve la función select. En nuestro ejemplo anterior:

Lo que devuelve la queryFn será un objeto con el tipo:


type Data = { name: string, updatedAt: number }

Después de la transformación con select, si desestructuramos los datos de useQuery, serán solamente del tipo:


{ name: string }


Esto asegura que el componente solo conoce y está tipado para la parte de los datos que realmente necesita, manteniendo la seguridad de tipos y la granularidad.


Y si la transformación en select resultara ser prohibitivamente costosa, siempre podrías memoizarla con useCallback para que se ejecute solo cuando sea necesario.


select: React.useCallback(
  expensiveTransformation, 
  []
)


Por lo tanto, a estas alturas está claro que, en lo que respecta a los datos, React Query intenta ser lo más eficiente posible manteniendo su referencia estable cuando es posible y solo volviendo a renderizar los componentes cuando es necesario a través del Observador.

Sin embargo, cuando invocas useQuery, no solo recibes los data, sino un objeto completo que representa todo sobre la query en sí, incluyendo el status, fetchStatus, error, etc.

A pesar de los beneficios de rendimiento de cómo React Query maneja los data, todo sería inútil si un componente tuviera que volver a renderizarse cada vez que cualquiera de las propiedades del objeto Query cambiara.

Y para empeorar las cosas, como has visto, propiedades como fetchStatus cambian a menudo, ya que React Query siempre está haciendo refetches en segundo plano para asegurar que los datos estén actualizados.

Entonces, ¿cómo resolvemos esto? Con una característica realmente interesante que llamamos Propiedades Rastreadas (Tracked Properties).

Cuando React Query crea el objeto de resultado devuelto por useQuery, lo hace con accesores (getters) personalizados.

https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty#custom_setters_and_getters

¿Por qué es esto importante? Porque permite al Observador entender y hacer un seguimiento de qué campos han sido accedidos en la función de renderizado y, al hacerlo, solo volver a renderizar el componente cuando esos campos realmente cambian.

Por ejemplo, si un componente no usa fetchStatus, no tiene sentido que ese componente se vuelva a renderizar solo porque el fetchStatus cambie de idle a fetching y viceversa. Son las Propiedades Rastreadas las que hacen esto posible y aseguran que los componentes estén siempre actualizados, mientras mantienen su recuento de renders al mínimo necesario.

- Solo asegúrate de que...

Cuando invoques useQuery, querrás hacerlo sin usar el operador rest (...).

Por ejemplo, esto está bien:


const { data, error } = useQuery({ queryKey, queryFn })


y esto también está bien:


const result = useQuery({ queryKey, queryFn })

result.data
result['error']


Pero esto es una mala idea:


const { data, ...rest } = useQuery({ queryKey, queryFn })


La razón es que si usas el operador rest (...), React Query tendrá que invocar todos los getters personalizados (Propiedades Rastreadas), anulando cualquiera de los beneficios de rendimiento que obtendrías al no volver a renderizar cuando no es necesario.

Para mayor seguridad, el plugin de ESLint de Query también tiene una regla para verificar estos escenarios.

https://tanstack.com/query/v5/docs/react/eslint/no-rest-destructuring


A estas alturas, hemos cubierto diferentes optimizaciones de renderizado que React Query realiza internamente y algunas que puedes hacer tú mismo (como select). Sin embargo, no solo se puede optimizar el renderizado, sino también las peticiones de datos (fetches).

En un mundo ideal, cada usuario tendría Internet rápido e ilimitado. Como sabes, vivimos en un mundo oscuro, cruel e implacable y no siempre es así.

Afortunadamente, como has visto, React Query hace un trabajo bastante decente de forma predeterminada para adaptarse a todo tipo de conexiones.

Una forma es que, en lugar de obtener y refetchear datos constantemente, React Query solo vuelve a obtener datos obsoletos (stale) basándose en señales del usuario. Por supuesto, puedes ajustar esto configurando staleTime, pero eso no siempre es suficiente.

Por ejemplo, supón que tienes una aplicación con un campo de entrada de búsqueda no debounced que obtiene algunos datos. Cada pulsación de tecla crearía una query nueva, disparando múltiples solicitudes en rápida sucesión. No hay nada que puedas hacer con staleTime para solucionar eso.

Y podría sorprenderte saber que, por defecto, React Query dejará que todas esas queries se resuelvan, a pesar de que es probable que solo te interese la última respuesta.

La ventaja de este enfoque es que llenará la caché con datos que potencialmente podrías necesitar más tarde. La desventaja, por supuesto, es el desperdicio de recursos, tanto en el cliente como en el servidor.

Depende de ti decidir si te gusta ese comportamiento, pero si no, React Query te da la opción de desactivarlo con la ayuda de la API de Abort Controller.

https://developer.mozilla.org/en-US/docs/Web/API/AbortController

Así es como funciona:

Cuando React Query invoca una queryFn, le pasará una signal como parte del QueryFunctionContext. Esta signal se origina en un AbortController (que React Query creará) y, si se la pasas a tu solicitud fetch, React Query podrá cancelar la solicitud si la Query deja de usarse.


function useIssues(search) {
  return useQuery({
    queryKey: ['issues', search],
    queryFn: ({ signal }) => {
      const searchParams = new URLSearchParams()
      searchParams.append('q', `${search} is:issue repo:TanStack/query`)

      const url = `https://api.github.com/search/issues?${searchParams}`

      const response = await fetch(url, { signal })

      if (!response.ok) {
        throw new Error('fetch failed')
      }

      return response.json()
    }
  })
}


Y si añadimos esto a una aplicación, puedes ver que todas las entradas de la query son creadas, todas las solicitudes se disparan inmediatamente, pero solo la última se colocará en la caché, y todas las demás serán canceladas.


import { useQuery } from '@tanstack/react-query'
import { fetchIssues } from './api'

function useIssues(search) {
  return useQuery({
    queryKey: ['issues', search],
    queryFn: ({ signal }) => fetchIssues(search, signal),
    staleTime: 1 * 60 * 1000,
  })
}

export function IssueList({ search }) {
  const { data, status, fetchStatus } = useIssues(search)
  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>Error fetching data 😔</div>
  }

  if (data.items.length === 0) {
    return <div>No results found</div>
  }

  return (
    <div>
      <ul>
        { data.items.map(issue => <li key={issue.id}>{issue.title}</li>) }
      </ul>
      <div>{ fetchStatus === 'fetching' ? 'updating...' : null }</div>
    </div>
  )
}


Independientemente de la técnica de optimización que utilices, es importante comprender que tienes opciones cuando las necesitas.