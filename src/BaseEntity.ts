import { AerospikeBins } from 'aerospike'
import { DefaultBinBuilder, getBinMetadata } from './decorators'

export class BaseEntity {
  public id: string | number

  constructor(id: string | number) {
    this.id = id
  }

  toRecord(): AerospikeBins {
    const metadata = getBinMetadata(this)
    const bins: AerospikeBins = { id: this.id }

    for (const { propertyKey, binName, options } of metadata) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
      let value = (this as any)[propertyKey]

      if (value === undefined && options.default !== undefined) {
        value = typeof options.default === 'function'
          ? (options.default as DefaultBinBuilder)()
          : options.default
      }

      if (options.required && (value === undefined || value === null)) {
        throw new Error(`Missing required field: ${propertyKey}`)
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      bins[binName] = value ?? null
    }

    return bins
  }

  static fromRecord<T extends typeof BaseEntity>(
    this: T,
    bins: AerospikeBins,
  ): InstanceType<T> {
    const id = bins.id as string | number
    if (!id) throw new Error('Missing "id" field in record')

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const instance = new this(id) as any
    const metadata = getBinMetadata(instance)

    for (const { propertyKey, binName } of metadata) {
      if (binName in bins) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
        instance[propertyKey] = bins[binName]
      }
    }

    return instance as InstanceType<T>
  }
}
