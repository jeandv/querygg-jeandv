// En este desafío, debes obtener datos de una API real utilizando React Query. Esta API es la que utilizaremos a lo largo de los desafíos. 
//Puedes encontrar documentación sobre los diferentes puntos finales aquí "https://library-api.rq-library-api.workers.dev/". 
//Hemos proporcionado la URL del punto final para obtener «El Hobbit». 
//Tu tarea consiste en implementar la función getData y crear una consulta que devuelva los datos de este punto final para renderizar la interfaz de usuario.

// TAREAS
// Implementa la función getData para obtener datos de la API. Asegúrate también de gestionar los errores de red.
// Crea una consulta que utilice la función getData para obtener datos de la API.
// Utiliza los ciclos de vida de las consultas para renderizar la interfaz de usuario en función del estado de la consulta.

import { useQuery } from "@tanstack/react-query";

const BASE_URL = "https://library-api.uidotdev.workers.dev";

export async function getData() {
  const url = `${BASE_URL}/books/pD6arNyKyi8C`;

  const res = await fetch(url);

  if (!res.ok) throw new Error("ERROR", response.status);

  return res.json();
}

function Book() {
  const { data, isError, isPending } = useQuery({
    queryKey: ["books"],
    queryFn: getData,
  });

  if (isError) {
    return <Error />;
  }

  if (isPending) {
    return <Loading />;
  }

  return (
    <main className="book-detail">
      <div>
        <span className="book-cover">
          <img src={data.thumbnail} alt={data.title} />
        </span>
      </div>
      <div>
        <h2 className="book-title">{data.title}</h2>
        <small className="book-author">{data.authors?.join(", ")}</small>
      </div>
    </main>
  );
}

function Loading() {
  return <main>Loading...</main>;
}

function Error() {
  return <main>Woops there was an error...</main>;
}

export default function App() {
  return (
    <div>
      <header className="app-header">
        <h1>
          <span>Query Library</span>
        </h1>
      </header>
      <Book />
    </div>
  );
}