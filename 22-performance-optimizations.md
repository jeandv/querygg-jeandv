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


