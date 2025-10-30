import { AerospikeBinValue } from 'aerospike'

const BinMetadataKey = Symbol('aerospike:bin')

export type DefaultBinBuilder = () => AerospikeBinValue

export interface BinOptions {
  required?: boolean
  default?: DefaultBinBuilder | AerospikeBinValue
}

export interface BinMetadata {
  propertyKey: string
  binName: string
  options: BinOptions
}

export function Bin(
  name?: string,
  options: BinOptions = {},
): PropertyDecorator {
  return (target, propertyKey) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const existing: BinMetadata[]
      = Reflect.getMetadata(BinMetadataKey, target.constructor) ?? []

    existing.push({
      propertyKey: propertyKey.toString(),
      binName: name ?? propertyKey.toString(),
      options,
    })

    Reflect.defineMetadata(BinMetadataKey, existing, target.constructor)
  }
}

export function getBinMetadata(target: any): BinMetadata[] {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-return
  return Reflect.getMetadata(BinMetadataKey, target.constructor ?? target) ?? []
}
