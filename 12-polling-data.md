## Polling Data

Volvamos a repasar algunos principios fundamentales de React Query:

React Query siempre nos dará los datos en caché al instante, incluso si no están frescos.

Por defecto, todas las consultas se consideran obsoletas al instante, ya que el staleTime por defecto es 0.

Si una consulta está obsoleta, React Query volverá a obtener los datos y actualizará la caché cuando ocurra un disparador.

Hay cuatro disparadores: cuando una queryKey cambia, un nuevo Observer se monta, la ventana recibe un evento de focus, y el dispositivo se conecta a internet.

Estos principios le permiten a React Query proporcionar una experiencia de usuario excepcional de forma predeterminada. Sin embargo, todavía hay un escenario que estos principios no cubren: obtener datos en un punto de tiempo específico.

Toma este escenario, por ejemplo, digamos que estás construyendo un panel de control de análisis para tu empresa. Lo más probable es que quieras asegurarte de que los datos estén siempre actualizados después de una cierta cantidad de tiempo, independientemente de si ocurre un "disparador".

Para lograr esto, necesitas una forma de decirle a React Query que debe invocar la queryFn periódicamente a un intervalo específico, sin importar qué.

Este concepto se llama sondeo (polling), y puedes lograrlo pasando una propiedad refetchInterval a useQuery cuando lo invocas.


useQuery({
  queryKey: ['repos', { sort }],
  queryFn: () => fetchRepos(sort),
  refetchInterval: 5000 // 5 seconds
})


Con un refetchInterval de 5000, la queryFn se invocará cada 5 segundos, independientemente de si hay un disparador o si la consulta aún tiene datos fresh (frescos).

Debido a esto, refetchInterval es más adecuado para escenarios en los que tienes datos que cambian con frecuencia y siempre quieres que la caché esté lo más actualizada posible.

Es importante notar que el temporizador de refetchInterval es inteligente. Si un disparador tradicional ocurre y actualiza la caché mientras el temporizador está contando, el temporizador se reiniciará.

Podemos ver esto demostrado en este ejemplo.


import * as React from "react"
import { useQuery } from '@tanstack/react-query'

function useUuid() {
  return useQuery({
    queryKey: ['uuid'],
    queryFn: async () => {
      const response = await fetch(`https://uuid.rocks/json`)

      if (!response.ok) {
        throw new Error('fetch failed')
      }

      return response.json()
    },
    refetchInterval: 3000 // 3 seconds
  })
}

export default function App() {
  const { data, status, fetchStatus, refetch } = useUuid()

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>Error fetching UUID</div>
  }

  return (
    <p>
      <div>{data.uuid}</div>
      <button onClick={() => refetch()}>Refetch</button>
      <span>
        { fetchStatus === 'fetching' ? 'updating...' : null }
      </span>
    </p>
  )
}


Al establecer un refetchInterval de 3000, cada 3 segundos, React Query dispara la queryFn, obteniendo un nuevo UUID.

Sin embargo, si disparamos explícitamente un refetch haciendo clic en el botón Refetch, el UUID se actualiza y el temporizador se reinicia.

Otro aspecto interesante de refetchInterval es que puedes continuar el sondeo hasta que se cumpla una cierta condición. Esto es útil si tienes un endpoint que realiza una tarea costosa y quieres sondear hasta que esa tarea termine.

Por ejemplo, tomemos un endpoint que procesa algunos números a través de un sistema distribuido. Primero, podría devolver un JSON que se vea así.


{
  "total": 2341,
  "finished": false
}


pero algún tiempo después, podría verse así.


{
  "total": 5723,
  "finished": true
}


Claro, es probable que no tenga sentido continuar con el sondeo después de que la respuesta nos diga que el cálculo ha terminado.

Para lograr esto, puedes pasar una función a refetchInterval. Cuando lo haces, esa función aceptará la consulta como un argumento, lo que te permitirá inspeccionar el estado de la consulta y determinar si el intervalo debe continuar. Si devuelves false desde la función que pasas a refetchInterval, el intervalo se desactivará.

Así que, de nuevo, asumiendo que recibimos una respuesta JSON como la anterior con una propiedad explícita finished, nuestra función refetchInterval se vería así.


useQuery({
  queryKey: ['totalAmount'],
  queryFn: () => fetchTotalAmount(),
  refetchInterval: (query) => {
    if (query.state.data?.finished) {
      return false
    }

    return 3000 // 3 seconds
  }
})


Ahora, tan pronto como los datos en la caché tengan una propiedad finished con el valor true, el sondeo se detendrá.