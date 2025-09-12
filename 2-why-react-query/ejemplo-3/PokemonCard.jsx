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