import knex from "knex";
const port = 2323;

const database = knex({
  client: "mysql",
  connection: {
    host: "localhost",
    user: "root",
    password: "",
    database: "admissions",
  },
});

const tredumoDB = knex({
  client: "mysql",
  connection: {
    host: "localhost",
    user: "root",
    password: "",
    database: "nkumba",
  },
});

const postgraduateDB = knex({
  client: "mysql",
  connection: {
    host: "localhost",
    user: "root",
    password: "root",
    database: "postgrad_db",
    port: 8889
  },
});


export { port, database, tredumoDB, postgraduateDB };
