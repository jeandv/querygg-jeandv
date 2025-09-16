Dado el siguiente código, ¿qué se mostrará en la interfaz de usuario?

(Como es obvio que no sabes cuál será el resultado de Math.random(), supongamos que en su primera invocación devolverá 0,123456789 y en la segunda, 0,987654321).


import * as React from "react"
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'

const queryClient = new QueryClient()

function LuckyNumber() {
  const { data } = useQuery({
    queryKey: ['luckyNumber'],
    queryFn: () => {
      return Promise.resolve(Math.random())
    }
  })

  return (
    <div>Lucky Number is: {data}</div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LuckyNumber />
      <LuckyNumber />
    </QueryClientProvider>
  )
}


Si has pensado...

Lucky Number is: 0.123456789
Lucky Number is: 0.987654321

...estarías equivocado. Esta es la respuesta correcta:

Lucky Number is: 0.123456789
Lucky Number is: 0.123456789


Esto puede parecer extraño, pero demuestra una de las características más potentes de useQuery: la deduplicación.


Sé que suena como una palabra compleja, pero en realidad no es tan difícil.


Recuerda que una de las principales ventajas de React Query es que elimina la complejidad de gestionar tu propia caché.


En la primera invocación de useQuery, React Query tomará el valor que resuelve queryFn (0,123456789), lo guardará en la caché en queryKey (luckyNumber) y luego lo devolverá.


Luego, en la segunda invocación, como estamos usando el mismo queryKey (luckyNumber) y ya hay un valor en la caché en esa ubicación (0.123456789), React Query devolverá ese valor inmediatamente, sin siquiera ejecutar queryFn nuevamente.


Esto es la deduplicación en acción.


Lo bueno es que, como la caché es global, tampoco tiene por qué ser el mismo componente el que utilice la consulta.


import * as React from "react"
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'

const queryClient = new QueryClient()

function FortuneCookie() {
  const { data } = useQuery({
    queryKey: ['luckyNumber'],
    queryFn: () => {
      return Promise.resolve(Math.random())
    }
  })

  if (data > 0.5) {
    return <div>Today's your lucky day</div>
  }

  return <div>Better stay home today</div>
}

function LuckyNumber() {
  const { data } = useQuery({
    queryKey: ['luckyNumber'],
    queryFn: () => {
      return Promise.resolve(Math.random())
    }
  })

  return (
    <div>Lucky Number is: {data}</div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LuckyNumber />
      <FortuneCookie />
    </QueryClientProvider>
  )
}

Lucky Number is: 0.5035552889410883
Today's your lucky day


Aunque nuestras invocaciones de useQuery ahora se encuentran en diferentes componentes, se sigue aplicando la misma lógica. useQuery comprobará la caché en busca de un valor en su queryKey y lo devolverá si existe. Si no es así, invocará queryFn, obtendrá el valor con el que se resuelve, lo almacenará en la caché y luego lo retornara.


Y, por supuesto, siempre podríamos abstraer nuestra lógica de consulta en su propio hook personalizado.


import * as React from "react"
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'

const queryClient = new QueryClient()

function useLuckyNumber() {
  return useQuery({
    queryKey: ['luckyNumber'],
    queryFn: () => {
      return Promise.resolve(Math.random())
    }
  })
}

function FortuneCookie() {
  const { data } = useLuckyNumber()

  if (data > 0.5) {
    return <div>Today's your lucky day</div>
  }

  return <div>Better stay home today</div>

}

function LuckyNumber() {
  const { data } = useLuckyNumber()

  return (
    <div>Lucky Number is: {data}</div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LuckyNumber />
      <FortuneCookie />
    </QueryClientProvider>
  )
}

Lucky Number is: 0.8849314821098261
Today's your lucky day



Este sencillo ejemplo demuestra realmente el poder de usar React Query con hooks personalizados.


Al abstraer nuestra lógica de consulta en su propio hook, hemos tomado lo que históricamente ha sido un código asíncrono complejo y lo hemos abstraído en un hook reutilizable y de nombre sencillo que se comporta como si fuera síncrono.


En realidad, la razón por la que esto funciona se debe a los observadores de consultas y a un conocido patrón de diseño de software llamado
el patrón observador.

"Con el Observer pattern, un sujeto (en nuestro caso: una consulta en QueryCache) mantiene una lista de sus dependientes (en nuestro caso: los componentes que utilizan las consultas) y les notifica automáticamente cualquier cambio de estado."

Esto significa que obtendremos la máxima previsibilidad, ya que cada componente mostrará siempre exactamente lo que hay almacenado en la caché, al tiempo que se mantendrá un alto rendimiento al llamar a queryFn solo cuando sea necesario.


Y no importa dónde se encuentren esos componentes en el árbol de componentes. Siempre que estén bajo el mismo QueryClientProvider, leerán la misma caché.

"For TypeScript Users
Notice that the custom hook code above still works exactly the same in TypeScript and JavaScript. We don't have to provide a type annotation for the return value of our custom hook - we can leverage type inference.

Show More
We can see in this TypeScript playground that the return type of our custom hook is inferred as UseQueryResult<number, Error>. This means our data property will be of type number | undefined - number because that's what our queryFn returns, and undefined because it might not exist in the cache while we fetch it.

If you absolutely must provide a type annotation (e.g. because a lint rule enforces it or your Tech Lead insists), UseQueryResult<number> works well, but you'll lose that type inference from the queryFn. The type UseQueryResult can be imported from @tantack/react-query, as this TypeScript playground shows"

https://www.typescriptlang.org/docs/handbook/type-inference.html
https://www.typescriptlang.org/play?#code/JYWwDg9gTgLgBAbzgVwM4FMCKz1QJ5wC+cAZlBCHAOQACMAhgHaoMDGA1gPRTr2swBaAI458VALAAoKSWSN+wCIxQYAMsg54AcshAAjXAAoAlIimdOcK9bgA9APxSrPGMijK0WUXkMIn1kVw8AGl0PAAuOABtKgAbDXZtXQMoKgBdABp-K0D8ADFGSJM4AF4APjNJG2d0V3c4AAVyEGAMADoeVAhYgDd0QwBZehgACw6mABMKE2Nson9CWclCIA
https://www.typescriptlang.org/play?#code/JYWwDg9gTgLgBAbzgVwM4FMCKz1QJ4A0cAqhtrngErqrIA28AvnAGZQQhwDkAAjAIYA7VAIDGAawD0UdP1EwAtAEcc+LgFgAUFpbJB84BEEoMAGWQS8AOWQgARrgAUASgBcJMqqo16MADyCtg5QAHyIWnBwMjDIUMZoWF6OCBGRcCoUANLoeO4A2lx0FuLWQbhcALoEqZEZ+ABigu4ucAC8YSmaaWnRscYACuwgwBgAdDKoEHQAbuiOALL8MAAW40IAJhwuzjVwjKmMO5qMQA