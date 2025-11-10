// En este desafío, nuestro objetivo es implementar una función de scroll infinito para nuestra aplicación. Para lograrlo, necesitaremos algunas cosas diferentes. Primero, hemos preparado un hook useInView. Este hook nos permite detectar cuándo un elemento es visible en un contenedor de desplazamiento y nos proporciona un callback onChange que podemos usar para activar la solicitud de datos.

// const rootRef = React.useRef(null);

// const { ref } = useInView({
//   threshold: 0,
//   root: rootRef.current,
//   rootMargin: "40px",
//   onChange: (inView) => {
//    puedes manejar la solicitud de datos aquí
//   },
// });

// adjunta la ref al elemento que queremos observar

// <ol ref={rootRef}>
//   <li ref={ref} />
// </ol>;

// Nuestro endpoint de la API devuelve un objeto que tiene el siguiente aspecto:


// {
//   activities: Array(10), // Un array de actividades
//   currentPage: 1,       // La página actual
//   totalPages: 12,       // El número total de páginas disponibles
//   totalItems: 116,      // El número total de elementos
// }

// Hemos creado una función getActivity que recibe un argumento page y devuelve los datos de la API.

// Tareas

// Solicita la primera página de datos cuando el componente se monte.

// Renderiza las actividades en el feed de actividades.

// Adjunta un elemento al final de la lista con la ref devuelta por useInView si tenemos más páginas.

// Si ese elemento se vuelve visible, solicita la página siguiente de datos.

// Muestra el componente <NoMoreActivities /> si no hay más páginas.

// App.jsx:
import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getActivity, flattenActivities } from "./utils";
import { ActivityListItem, NoMoreActivities } from "./ActivityComponents";
import useInView from "./useInView";

function usePosts() {
  return useInfiniteQuery({
    queryKey: ['activities'],
    queryFn: ({ pageParam }) => getActivity(pageParam),
    staleTime: 5000,
    initialPageParam: 1,
    getNextPageParam: ({ currentPage, totalPages }) => {
      const nextPage = currentPage + 1;
      if (nextPage >= totalPages) {
        return undefined;
      }
      return nextPage;
    }
  })
}

function ActivityFeed() {
  const { status, data, fetchNextPage, hasNextPage, isFetchingNextPage } = usePosts()
  
  const rootRef = React.useRef(null);

  const { ref } = useInView({
   threshold: 0,
   root: rootRef.current,
   rootMargin: "40px",
   onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
   },
 });

  if (status === "pending") {
    return <div>...</div>;
  }
  if (status === "error") {
    return <div>Error fetching data 😔</div>;
  }

  const activities = flattenActivities(data.pages);
  const hasResults = activities.length > 0;

  return (
    <section className="latest-activity">
      <h2>Latest activity</h2>
      {hasResults ? (
        <ol ref={rootRef}>
          {activities.map((activity, i) => {
            return <ActivityListItem key={i} activity={activity} />;
          })}
          {hasNextPage ? (
            <li ref={ref} />
          ) : (
            <NoMoreActivities
              onBackToTop={() => {
                rootRef.current.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}
        </ol>
      ) : null}
    </section>
  );
}

export default function App() {
  return (
    <>
      <header className="app-header">
        <h1>
          <span>Query Library</span>
        </h1>
      </header>
      <main className="dashboard">
        <ActivityFeed />
      </main>
    </>
  );
}


// utils.js:
const BASE_URL = "https://library-api.uidotdev.workers.dev";

export async function getActivity(page) {
  const url = `${BASE_URL}/activity?pageSize=10&page=${page}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Unable fetch data");
  }

  const data = await response.json();
  return data;
}

export function createStarString(number) {
  if (typeof number !== "number") {
    return "No reviews";
  }

  const filledStars = Array.from({ length: Math.floor(number) }).map(() => "★");
  const emptyStars = Array.from({ length: 5 - filledStars.length }).map(
    () => "☆"
  );

  return filledStars.concat(emptyStars).join("");
}

export function getRatingString(number) {
  if (typeof number !== "number") {
    return "";
  }

  return `(${number} / 5)`;
}

export function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.round((now - date) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) {
    return `${seconds} seconds ago`;
  } else if (minutes < 60) {
    return `${minutes} minutes ago`;
  } else if (hours < 24) {
    return `${hours} hours ago`;
  } else {
    return `${days} days ago`;
  }
}

export function flattenActivities(pages) {
  return pages.flatMap((page) => page.activities);
}
