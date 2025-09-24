// En este desafío, tenemos un feed de actividad que muestra cuándo se unen nuevos usuarios a la biblioteca, cuándo se prestan o devuelven libros, y cuándo alguien deja una reseña. Dado que queremos mostrar la actividad más reciente, necesitamos sondear el servidor en busca de nuevos datos cada 5 segundos. También queremos mostrar la marca de tiempo de la última obtención de datos, a la que se puede acceder a través de la propiedad dataUpdatedAt del resultado de la consulta. Hemos incluido una utilidad para formatear la marca de tiempo llamada formatDate.

// Tareas

// Crea una consulta que sondee el servidor en busca de nueva actividad cada 5 segundos.

// Renderiza el feed de actividad con los datos más recientes.

// Muestra un texto que diga "Última actividad a partir de" con la marca de tiempo formateada de la última obtención de datos.

// App.jsx:
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getActivity, formatDate } from "./utils";
import ActivityList from "./ActivityList";
import Loader from "./Loader";

function useActivities() {
  return useQuery({
    queryKey: ['totalAmount'],
    queryFn: () => getActivity(),
    refetchInterval: 5000
  })
}

function ActivityFeed() {
  const { data, isPending, status } = useActivities();
  const actualDate = new Date()
  
  if (isPending) {
    return <Loader />;
  }

  return (
    <section className="latest-activity">
      <h2>Latest activity as of {formatDate(actualDate)}</h2>
      <ActivityList data={data} />
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

export async function getActivity() {
  const url = `${BASE_URL}/activity?pageSize=5`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Unable fetch data", response.status);
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
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

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

export function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}

// ActivityList.jsx:
import { timeAgo } from "./utils";

const messageMap = {
  review: "left a review for",
  return: "returned",
  checkout: "checked out",
  "new-user": "just joined Query Library"
};

function getBookDetails(activity) {
  if (activity.activityType === "review") {
    return activity.activityDetails.bookDetails;
  }
  return activity.activityDetails;
}

export default function ActivityList({ data }) {
  const hasResults = data?.activities?.length > 0;
  if (!hasResults) {
    return (
      <ol>
        <li className="no-activity">No new activity</li>
      </ol>
    );
  }
  return (
    <ol>
      {data.activities.map((activity, i) => {
        let { title, thumbnail } = getBookDetails(activity);
        return (
          <li key={i}>
            <span className="book-cover">
              {activity.activityType === "new-user" ? (
                <span>🎉</span>
              ) : (
                <img src={thumbnail} alt={title} />
              )}
            </span>
            <div>
              <p>
                <strong>Someone</strong> {messageMap[activity.activityType]}{" "}
                <em>{title}</em>.
              </p>
              <small className="activity-time">
                {timeAgo(activity.activityDate)}
              </small>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
