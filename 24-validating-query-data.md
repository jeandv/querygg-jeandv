## Validating Query Data


Al escribir software, es saludable seguir el antiguo proverbio ruso: "Confía, pero verifica".

Confía en que el código que escribes es correcto, pero verifica esa suposición a través de varias capas de tu código.

Por ejemplo, digamos que definimos un array de objetos.


const data = [
  {
    id: 1,
    name: 'Dominik',
  },
  {
    id: 2,
    name: 'Tyler',
  },
]


Ahora, escribamos una función que tome estos datos y devuelva un saludo para cada persona:


function getGreetings(input) {
  return input.map(({ name }) => `Hello, ${name.toUpperCase()}`)
}


La primera capa de verificación podría ser escribir una prueba para la función así:


describe('getGreetings', () => {
  it('should return greetings', () => {
    const input = [
      {
        id: 1,
        name: 'Dominik',
      },
      {
        id: 2,
        name: 'Tyler',
      },
    ]
    expect(getGreetings(input))
      .toEqual(['Hello, DOMINIK', 'Hello, TYLER'])
  })
})


Y si estuviéramos usando TypeScript, la segunda capa de verificación sería agregar definiciones de tipo a la función misma, así:"


function getGreetings(input: ReadonlyArray<{ name: string }>) {
  return input.map(({ name }) => `Hello, ${name.toUpperCase()}`)
}


De todas formas, debido a que fuimos nosotros quienes creamos el objeto de datos (data), sabemos exactamente cuál es la estructura del objeto y podemos construir nuestras capas de verificación en torno a eso.

Lamentablemente, este no es el caso cuando lidiamos con datos provenientes de APIs de terceros. Sí, podemos hacer una solicitud puntual e inspeccionar la estructura de la respuesta, pero no hay garantía de que esa estructura sea la misma para todas las respuestas en el futuro.

De hecho, se podría argumentar que la causa más común de bugs en las aplicaciones web se debe al desajuste en la estructura de los datos que un desarrollador espera y la estructura real de los datos que recibe.

Para empeorar las cosas, este tipo de bugs son intrínsecamente difíciles de rastrear, ya que generalmente conducen a un mensaje de error que podría originarse en una variedad de lugares.


Uncaught TypeError: Cannot read properties of undefined (reading 'name')


Afortunadamente, existe una forma probada de recuperar la confianza en los datos asíncronos, incluso de APIs que pueden ser impredecibles: la validación.

Cuando escuchas la palabra validación, como desarrollador web, lo primero que probablemente viene a tu mente es la validación de inputs (entradas). Cualquier entrada que obtengamos de un usuario, necesitamos validarla, ya sea por razones de experiencia de usuario (UX) en el frontend o por razones de seguridad en el backend.

Y si lo piensas, no hay una gran diferencia entre la entrada que obtenemos de un usuario y los datos que obtenemos de una API de terceros. Ambas son fuentes de datos no confiables que necesitamos manejar con cuidado.

Una librería que funciona muy bien para esto, particularmente con React Query, es Zod.

Zod es una librería de validación de esquemas que te permite definir la estructura esperada de una respuesta y luego valida la respuesta real contra ese esquema.

En cierto modo, actúa como una puerta por donde los datos que no coinciden con el esquema no pueden pasar. Esto la convierte en una solución perfecta para integrar con React Query y específicamente, con cualquier función de consulta (queryFn).

Para demostrar esto, volvamos a la primera lección del curso con nuestro ejemplo de Pokémon.

Como recordatorio, esto es lo que teníamos:


PokemonCard.jsx:
import * as React from "react";

export default function PokemonCard({ data, isLoading, error }) {
  if (isLoading === true) {
    return <div className="card" />
  }

  if (error) {
    return (
      <div className="card">
        <figure>
          <img
            width="100px"
            height="100px"
            src="https://ui.dev/images/courses/pokemon-unknown.png"
            alt="Unknown Pokemon Image"
          />
          <figcaption>
            <h4>Oops.</h4>
            <h6>{error}</h6>
          </figcaption>
        </figure>
      </div>
    )
  }

  return (
    <div className="card">
      <figure>
        <img
          width="475px"
          height="475px"
          src={data?.sprites?.front_default}
          alt={data.name}
        />
        <figcaption>
          <h4>{data.name}</h4>
          <h6>No. {data.id}</h6>
        </figcaption>
      </figure>
    </div>
  );
}


Pokemon.jsx:
import * as React from "react"
import PokemonCard from "./PokemonCard"
import { useQuery } from '@tanstack/react-query'

async function fetchPokemon(id) {
  const url = `https://pokeapi.co/api/v2/pokemon/${id}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('fetch failed')
  }

  return response.json()
}

export default function App () {
  const { data: pokemon, isLoading, error } = useQuery({
    queryKey: ['pokemon', 1],
    queryFn: () => fetchPokemon(1),
  })

  return (
    <>
      <PokemonCard 
        isLoading={isLoading} 
        data={pokemon} 
        error={error}
      />
    </>
  )
}


Ahora, al observar el JSX, notarás que nuestra Interfaz de Usuario (UI) depende de tres valores: id, name, y sprites.front_default.

Entonces, con Zod, podemos crear un esquema que represente esa estructura que esperamos.


const pokemonSchema = z.object({
  id: z.number(),
  name: z.string(),
  sprites: z.object({
    front_default: z.string().url(),
  }).optional(),
});


Y luego, una vez que obtenemos una respuesta de la API, podemos validarla contra nuestro esquema con el método parse de Zod:


import * as React from "react"
import PokemonCard from "./PokemonCard"
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

const pokemonSchema = z.object({
  id: z.number(),
  name: z.string(),
  sprites: z.object({
    front_default: z.string().url(),
  }).optional(),
});

async function fetchPokemon(id) {
  const url = `https://pokeapi.co/api/v2/pokemon/${id}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('fetch failed')
  }

  const data = await response.json()
  return pokemonSchema.parse(data)
}

export default function App () {
  const { data: pokemon, isLoading, error } = useQuery({
    queryKey: ['pokemon', 1],
    queryFn: () => fetchPokemon(1),
  })

  return (
    <>
      <PokemonCard 
        isLoading={isLoading} 
        data={pokemon} 
        error={error}
      />
    </>
  )
}


Aquí están sucediendo dos cosas interesantes que quizás hayas pasado por alto.

Primero, si abres el Data Explorer en las React Query Devtools, notarás que los datos en la caché en pokemon/1 son solo esos tres valores de nuestro esquema: id, name y sprites.front_default.

La razón de esto es que Zod elimina cualquier campo adicional que esté en el objeto de respuesta, pero que no esté en nuestro esquema. Esto asegura que no estemos almacenando valores innecesarios en la caché, lo cual puede reducir la cantidad de memoria requerida, especialmente cuando se trabaja con respuestas grandes como las que proporciona la API de Pokémon.

Segundo, la razón por la cual Zod se integra tan bien con React Query es porque, por defecto, lanza un error cuando la respuesta no coincide con el esquema proporcionado. Al hacerlo, Zod trata las respuestas no válidas de la misma manera que si la solicitud hubiera fallado. Y convenientemente, cualquier error es todo lo que React Query necesita para entrar en un estado de error.


- Para Usuarios de TypeScript:

Zod es una librería de validación de esquemas TypeScript-first con inferencia de tipos estática, lo que significa que cuando creamos un esquema de Zod, ya no tenemos que definir nuestros tipos manualmente. El resultado de llamar al método parse estará correctamente tipado de acuerdo con el esquema, y también se garantiza que la respuesta se adhiera al esquema en tiempo de ejecución (runtime).

Esto es excelente porque significa que ya no tenemos que depender de tipos definidos manualmente. Para acceder al tipo en sí, Zod proporciona un método auxiliar: z.infer:


const pokemonSchema = z.object({
  id: z.number(),
  name: z.string(),
  sprites: z.object({
    front_default: z.string().url(),
  }).optional(),
});

type Pokemon = z.infer<typeof pokemonSchema>


Cuanto más podamos confiar en los datos que ingresan a nuestra aplicación desde fuentes externas, más podremos confiar en nuestro código y en la aplicación en general.

Sin embargo, realizar la validación en tiempo de ejecución no es gratis e incurre en una sobrecarga (overhead). Las respuestas de red deben ser inspeccionadas, analizadas y sus tipos verificados en runtime. Esto puede ser costoso si las respuestas son grandes y tenemos que analizarlas (parsearlas) con frecuencia.

Como siempre, este es un compromiso (tradeoff) que debemos considerar. Si tienes control sobre la API que estás consultando, podría ser suficiente confiar en que devuelve lo que afirma. De lo contrario, quizás quieras considerar validar los datos.