import { AerospikeBins, AerospikeError, Client as AerospikeClient, Key, policy, QueryOptions, status } from 'aerospike'
import { BaseEntity } from './BaseEntity'
import { DefaultBinBuilder, getBinMetadata } from './decorators'

export interface GetAllOptions {
  query?: QueryOptions
  stream?: policy.QueryPolicy
}

export class BaseRepository<T extends BaseEntity> {
  public readonly client: AerospikeClient
  public readonly namespace: string
  public readonly setName: string

  constructor(client: AerospikeClient, namespace: string, setName: string) {
    this.client = client
    this.namespace = namespace
    this.setName = setName
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected instantiate(bins: AerospikeBins): T {
    throw new Error('Method not implemented')
  }

  async save(entity: T): Promise<void> {
    const bins = entity.toRecord()
    const key = new Key(this.namespace, this.setName, entity.id)
    await this.client.put(key, bins)
  }

  async get(id: string | number): Promise<T | null> {
    const key = new Key(this.namespace, this.setName, id)
    try {
      const record = await this.client.get(key)
      if (!record) return null
      return this.instantiate({ id, ...record.bins })
    } catch (e) {
      if (e instanceof AerospikeError && e.code === status.ERR_RECORD_NOT_FOUND) return null
      throw e
    }
  }

  async getOrCreate(id: string | number, data?: Partial<T>): Promise<T> {
    let entity = await this.get(id)
    if (!entity) {
      entity = this.instantiate({ id })
      Object.assign(entity, data ?? {})
      const metadata = getBinMetadata(entity)
      for (const { propertyKey, options } of metadata) {
        if (
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (entity as any)[propertyKey] === undefined
          && options.default !== undefined
        ) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          ;(entity as any)[propertyKey] = typeof options.default === 'function'
            ? (options.default as DefaultBinBuilder)()
            : options.default
        }
      }

      await this.save(entity)
    }

    return entity
  }

  async getMany(ids: (string | number)[]): Promise<T[]> {
    const batch = await this.client.batchRead(
      ids.map((id) => ({
        key: new Key(this.namespace, this.setName, id),
        readAllBins: true,
      })),
    )

    const foundResults = batch.filter(
      (result) => result.status === status.AEROSPIKE_OK && result.record,
    )

    return foundResults.map((r) => this.instantiate(r.record.bins))
  }

  async getAll(options?: GetAllOptions): Promise<T[]> {
    const entities: T[] = []

    const query = this.client.query(this.namespace, this.setName, options?.query)
    const stream = query.foreach(options?.stream)

    return new Promise<T[]>((resolve, reject) => {
      stream.on('data', (record) => {
        const entity = this.instantiate(record.bins)
        entities.push(entity)
      })
      stream.on('error', (err) => reject(err))
      stream.on('end', () => resolve(entities))
    })
  }

  async exists(id: string | number): Promise<boolean> {
    const key = new Key(this.namespace, this.setName, id)
    return await this.client.exists(key)
  }

  async update(id: string | number, data: Partial<T>) {
    const key = new Key(this.namespace, this.setName, id)

    const tempEntity = this.instantiate({ id })
    const metadata = getBinMetadata(tempEntity)

    const writeBins: AerospikeBins = {}

    for (const [ propertyKey, value ] of Object.entries(data)) {
      const binMetadata = metadata.find((m) => m.propertyKey === propertyKey)
      if (binMetadata) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        writeBins[binMetadata.binName] = value ?? null
      }
    }

    if (Object.keys(writeBins).length > 0) {
      await this.client.put(key, writeBins, null, { exists: policy.exists.UPDATE })
    }
  }

  async delete(id: string | number) {
    const key = new Key(this.namespace, this.setName, id)
    const exists = await this.exists(id)
    if (exists) await this.client.remove(key)
  }

  async deleteMany(ids: (string | number)[]) {
    await this.client.batchRemove(ids.map((id) =>
      new Key(this.namespace, this.setName, id)))
  }
}
