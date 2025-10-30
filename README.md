# Aerospike ORM for NodeJS

A TypeScript utility library for working with Aerospike using **entities** and a **base repository** pattern. Easily map class properties to Aerospike bins and perform CRUD operations

---

## Features

- Decorators (`@Bin`) for defining Aerospike bins on class properties
- Base entity (`BaseEntity`) with automatic serialization/deserialization
- Base repository (`BaseRepository`) with CRUD, batch read, and query support
- Supports default values and required fields

---

## Installation
```shell
npm i aerospike-orm
```

---

## Usage example

```ts
import { BaseEntity, Bin, BaseRepository } from 'aerospike-orm'
import { AerospikeBins, Client as AerospikeClient, exp } from 'aerospike'

class User extends BaseEntity {
  @Bin('username', { required: true })
  public name!: string

  @Bin('email')
  public email?: string

  @Bin('age', { default: 18 })
  public age!: number
}

class UserRepository extends BaseRepository<User> {
  static getSetName(): string {
    return 'users'
  }

  protected instantiate(bins: AerospikeBins): User {
    return User.fromRecord(bins)
  }
}

async function main() {
  const client = await AerospikeClient.connect({ hosts: '127.0.0.1:3000' })
  const repo = new UserRepository(client, 'test', 'users')

  // Create or get user
  const user = await repo.getOrCreate('user1', { name: 'Cool Name' })

  // Update
  user.age = 25
  await repo.save(user)

  // Fetch
  const fetched = await repo.get('user1')

  // Create user with saving
  const extraUser = new User('user2')
  extraUser.name = 'Coolest'
  await repo.save(extraUser)

  // Get all users
  const allUsers = await repo.getAll()

  // Get users with stream filter (expression)
  const coolestNameUsers = await repo.getAll({
    stream: {
      exp: exp.eq(exp.binStr('username'), exp.str('Coolest'))
    }
  })

  // Delete
  await repo.delete('user1')
  await repo.delete(extraUser.id)

  await client.close()
}

main().catch(console.error)
```

---

## Methods

### `BaseEntity`
| Property | Type               | Description                                                                                     |
| -------- | ------------------ |-------------------------------------------------------------------------------------------------|
| `id`     | `string \| number` | A unique identifier for the entity (used as Aerospike record key). Required in all entities |

| Method                                                                                 | Description                                             |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `toRecord(): AerospikeBins`                                                            | Serializes the entity to an Aerospike record (bins)     |
| `static fromRecord<T extends typeof BaseEntity>(bins: AerospikeBins): InstanceType<T>` | Deserializes an Aerospike record into an entity instance |

### `BaseRepository<T extends BaseEntity>`
| Method                                                             | Description                                                   |
| ------------------------------------------------------------------ | ------------------------------------------------------------- |
| `get(id: string \| number): Promise<T \| null>`                    | Retrieves an entity by ID. Returns `null` if not found        |
| `getOrCreate(id: string \| number, data?: Partial<T>): Promise<T>` | Retrieves an entity by ID or creates it with optional default data |
| `exists(id: string \| number): Promise<boolean>`                   | Checks if a record exists                                     |
| `save(entity: T): Promise<void>`                                   | Saves (inserts or updates) an entity                          |
| `delete(id: string \| number): Promise<void>`                      | Deletes an entity by ID                                       |
| `getByIds(ids: (string \| number)[]): Promise<T[]>`                | Retrieves multiple entities by their IDs using batch read     |
| `getAll(options?: GetAllOptions): Promise<T[]>`                    | Retrieves all entities, optionally with query/stream options. |

### `GetAllOptions`
Interface used by the getAll() method to control query behavior.
```ts
export interface GetAllOptions {
  query?: Aerospike.QueryOptions
  stream?: Aerospike.QueryPolicy
}
```

---

## Decorators

### `@Bin(name?: string, options?: BinOptions)`
### `BinOptions`
| Property   | Type                          | Default     | Description                                                          |
| ---------- |-------------------------------| ----------- | -------------------------------------------------------------------- |
| `required` | `boolean`                     | `false`     | If `true`, throws an error when the property is missing before saving |
| `default`  | `Aerospike.AerospikeBinValue` | `undefined` | Default value assigned when the property is `undefined`              |
