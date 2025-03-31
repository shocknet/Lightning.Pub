import { FindOperator, LessThan, MoreThan, LessThanOrEqual, MoreThanOrEqual, Equal, Like, ILike, Between, In, Any, IsNull, Not, FindOptionsWhere } from 'typeorm';
export type WhereCondition<T> = FindOptionsWhere<T> | FindOptionsWhere<T>[]

type SerializedFindOperator = {
    _type: 'FindOperator'
    type: string
    value: any
}

export function serializeFindOperator(operator: FindOperator<any>): SerializedFindOperator {
    return {
        _type: 'FindOperator',
        type: operator['type'],
        value: operator['value'],
    };
}

export function deserializeFindOperator(serialized: SerializedFindOperator): FindOperator<any> {
    switch (serialized.type) {
        case 'lessThan':
            return LessThan(serialized.value);
        case 'moreThan':
            return MoreThan(serialized.value);
        case 'lessThanOrEqual':
            return LessThanOrEqual(serialized.value);
        case 'moreThanOrEqual':
            return MoreThanOrEqual(serialized.value);
        case 'equal':
            return Equal(serialized.value);
        case 'like':
            return Like(serialized.value);
        case 'ilike':
            return ILike(serialized.value);
        case 'between':
            return Between(serialized.value[0], serialized.value[1]);
        case 'in':
            return In(serialized.value);
        case 'any':
            return Any(serialized.value);
        case 'isNull':
            return IsNull();
        case 'not':
            return Not(deserializeFindOperator(serialized.value));
        default:
            throw new Error(`Unknown FindOperator type: ${serialized.type}`);
    }
}

export function serializeRequest<T>(r: object): T {
    if (!r || typeof r !== 'object') {
        return r;
    }

    if (r instanceof FindOperator) {
        return serializeFindOperator(r) as any;
    }

    if (Array.isArray(r)) {
        return r.map(item => serializeRequest(item)) as any;
    }

    const result: any = {};
    for (const [key, value] of Object.entries(r)) {
        result[key] = serializeRequest(value);
    }
    return result;
}

export function deserializeRequest<T>(r: object): T {
    if (!r || typeof r !== 'object') {
        return r;
    }

    if (Array.isArray(r)) {
        return r.map(item => deserializeRequest(item)) as any;
    }

    if (r && typeof r === 'object' && (r as any)._type === 'FindOperator') {
        return deserializeFindOperator(r as any) as any;
    }

    const result: any = {};
    for (const [key, value] of Object.entries(r)) {
        result[key] = deserializeRequest(value);
    }
    return result;
}