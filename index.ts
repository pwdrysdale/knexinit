import express from "express"
// import and use dotenv
import dotenv from "dotenv"
dotenv.config()
import _knex from "knex"

// cheatsheet ref:
// https://devhints.io/knex

const app = express()
import { knex } from "./database/connection"

app.get("/", (_, res) => {
  res.send("Hello World!")
})

app.get("/db", async (req, res) => {
  try {
    // delete a table
    await knex.schema.dropTableIfExists("users")

    console.log("Dropped table")
    console.log("Creating new table")

    // create a table
    await knex.schema.createTable("users", (table) => {
      table.increments("id").primary()
      table.string("name")
      table.string("email")
      table.string("password")

      // uniques
      // table.string("favourite food").unique()

      // some data types
      // table.integer("age");
      // table.boolean("isAdmin");
      // table.date("created_at");
    })

    // add some data to a table
    // note that what this returns here seems to be a status code
    const users = await knex("users").insert([
      {
        name: "John Doe",
        email: "john@doe.comn",
        password: "123456",
      },
      {
        name: "Jane Doe",
        email: "jane@done.com",
        password: "123456",
      },
    ])

    // as something like a status code was returned these look pretty useless
    console.log(users)
    // same here
    res.send(users)
  } catch (e) {
    // just log something
    console.log("Doin")
    console.log(e)
  }
})

app.get("/db/more", async (req, res) => {
  try {
    await knex("users").insert({
      name: "Bam bam",
      email: "bam@bam.com",
      password: "123456",
    })
    // it seems that the inserting is always done as a batch
    await knex("users").insert([
      {
        name: "Peter Piper",
        email: "peter@peter.com",
        password: "123456",
      },
      {
        name: "Pan",
        email: "pan@pan.com",
        password: "123456",
      },
    ])

    // trying to get a more helpful output - this could be
    // modified / cleaned up etc.
    // obviously some data retrieval
    const data = await knex.select("*").from("users")
    res.send(data)
  } catch (e) {
    console.log(e)
  }
})

app.get("/db/deleteone", async (req, res) => {
  try {
    // get the id of someone to delete
    const ids = await knex("users").select("id").limit(1)
    console.log(ids)
    const deleteid = ids[0].id
    await knex("users").where("id", deleteid).del()
    res.send({ deleted: deleteid })
  } catch (e) {
    console.log(e)
  }
})

app.get("/db/newtable", async (req, res) => {
  try {
    await knex.schema.dropTableIfExists("useraddress")

    // create a new table
    await knex.schema.createTable("useraddress", (table) => {
      table.increments("id").primary()
      table.integer("user_id").unsigned().references("id").inTable("users")
      table.string("address")
    })

    // add some data to the new table
    await knex("useraddress").insert([
      {
        user_id: 1,
        address: "123 Main St",
      },
      {
        user_id: 2,
        address: "456 Main St",
      },
    ])

    res.send("New table created")
  } catch (e) {
    console.log(e)
  }
})

app.get("/db/jointables", async (req, res) => {
  try {
    await knex.schema.dropTableIfExists("useraddress")
    await knex.schema.dropTableIfExists("users")

    await knex.schema.createTable("users", (table) => {
      table.increments("id").primary()
      table.string("name")
      table.string("email")
      table.string("password")
    })

    await knex.schema.createTable("useraddress", (table) => {
      table.increments("id").primary()
      table.integer("user_id").unsigned().references("id").inTable("users")
      table.string("address")
    })

    await knex("users")
      .join("useraddress", "users.id", "useraddress.user_id")
      .insert([
        {
          name: "John Doe",
          email: "john@john.com",
          password: "123456",
        },
        {
          name: "Jane Doe",
          email: "jane@jane.com",
          password: "123456",
        },
      ])

    await knex("useraddress")
      .join("users", "useraddress.user_id", "users.id")
      .insert([
        {
          address: "123 Main St",
          user_id: 1,
        },
        {
          address: "456 Main St",
          user_id: 2,
        },
        {
          address: "789 Main St",
          user_id: 2,
        },
      ])

    const users = await knex.select("*").from("users")
    const address = await knex.select("*").from("useraddress")

    // map the addresses back onto the users
    const mapped = users.map((u) => ({
      ...u,
      address: address.filter((a) => a.user_id === u.id).map((a) => a.address),
    }))

    const joint = await knex("useraddress").join(
      "users",
      "useraddress.user_id",
      "users.id"
    )

    const joint2 = await knex("users").join(
      "useraddress",
      "users.id",
      "useraddress.user_id"
    )

    // could explore many to many but imagine wf is similar

    res.send({ users, address, mapped, joint, joint2 })
  } catch (e) {
    console.log(e)
  }
})

app.get("/db/modify", async (req, res) => {
  try {
    await knex("users").where("id", 1).update({
      name: "John Doe",
      email: "johnnyboy@gmail.com",
      password: "123456",
    })

    const users = await knex.select("*").from("users")
    res.send(users)
  } catch (e) {
    console.log(e)
  }
})

app.get("/db/addcolumn", async (req, res) => {
  try {
    await knex.schema.table("users", (table) => {
      table.string("details").defaultTo("something important")
    })

    const users = await knex.select("*").from("users")
    res.send(users)
  } catch (e) {
    console.log(e)
  }
})

app.get("/raw", async (req, res) => {
  try {
    const users = await knex.raw("select * from users")
    res.json(users[0])
  } catch (e) {
    console.log(e)
  }
})

app.get("/query", async (req, res) => {
  try {
    const users = await knex("users").select("*")
    res.json(users)
  } catch (e) {
    console.log(e)
  }
})

app.get("/builder", async (req, res) => {
  // a much simplified version of the 'getBuilder' function
  const getBuilder = (tableName: string) => {
    let builder = _knex({
      client: "mysql2",
    })
    return builder(tableName)
  }

  // a much simplified version of the 'execute' function
  const execute = async (builder: any) => {
    const raw = builder.toString()

    const db = _knex({
      client: "mysql2",
      connection: {
        host: "127.0.0.1",
        port: 3306,
        user: "root",
        password: process.env.DB_PASSWORD,
        database: "testdb",
      },
    })

    const [result] = await db.raw(raw)

    return result
  }

  // actually using it => this is the part we largely have access to
  const list = getBuilder("users")
  const user2 = getBuilder("users").where("id", 2)

  // then you have to execute these queries
  const userList = await execute(list)
  console.log(await execute(user2))

  // send whatever you want back to the client
  res.json(userList)
})

app.get("/transaction", async (req, res) => {
  // note that this is a get request to save us setting up a post or put

  const mainDb = _knex({
    client: "mysql2",
    connection: {
      host: "127.0.0.1",
      port: 3306,
      user: "root",
      password: process.env.DB_PASSWORD,
      database: "testdb",
    },
  })

  let output

  // a seperate fn so you can see how things are passed down
  const addAddress = async (userId: any, trx = mainDb) => {
    if (trx) {
      await trx
        .insert({ address: "123 Main St", user_id: userId })
        .into("useraddress")
    }
  }

  // main transaction calling
  await mainDb.transaction(async (trx) => {
    await trx.raw(
      `
      INSERT INTO users (name, email, password)
      VALUES ("John Doe", "john@doe.com", "123456")
    `
    )

    // could return this from above, but its also less important
    // to make read requests on trasactions
    const users = await trx.select("*").from("users")

    // call that other db request
    await addAddress(users[users.length - 1].id, trx)

    // get a nice return
    output = await trx("users")
      .select({ userId: "users.id", address: "useraddress.address" })
      .leftJoin("useraddress", "users.id", "useraddress.user_id")
  })

  res.json(output)
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => console.log(`Server is running on ${PORT}`))
