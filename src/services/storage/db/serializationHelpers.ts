import { FindOperator, LessThan, MoreThan, LessThanOrEqual, MoreThanOrEqual, Equal, Like, ILike, Between, In, Any, IsNull, Not, FindOptionsWhere, And } from 'typeorm';
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
        value: (Array.isArray(operator['value']) && operator['type'] !== 'between') ? operator["value"].map(serializeFindOperator) : operator["value"],
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
            console.log("serializing between", serialized.value)
            return Between(serialized.value[0], serialized.value[1]);
        case 'in':
            return In(serialized.value);
        case 'any':
            return Any(serialized.value);
        case 'isNull':
            return IsNull();
        case 'not':
            return Not(deserializeFindOperator(serialized.value));
        case 'and':
            if (serialized.value.length !== 2) {
                throw new Error("Typeorm and operator with more than 2 arguments not supported");
            }
            return And(deserializeFindOperator(serialized.value[0]), deserializeFindOperator(serialized.value[1]));
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

export function serializeResponseData<T>(r: T) {
    // flag Date objects
    function replaceDates(val: any): any {
        if (val instanceof Date) {
            return { __type: 'Date', value: val.toISOString() };
        } else if (Array.isArray(val)) {
            return val.map(replaceDates);
        } else if (val && typeof val === 'object') {
            const result: any = {};
            for (const key in val) {
                result[key] = replaceDates(val[key]);
            }
            return result;
        }
        return val;
    }

    return replaceDates(r);
}

export function deserializeResponseData<T>(r: T) {

    // reconstruct flagged Date objects
    function reviveFlaggedDates(value: any): any {
        if (
            value &&
            typeof value === 'object' &&
            value.__type === 'Date' &&
            typeof value.value === 'string'
        ) {
            return new Date(value.value);
        } else if (Array.isArray(value)) {
            return value.map(reviveFlaggedDates);
        } else if (value && typeof value === 'object') {
            for (const key in value) {
                value[key] = reviveFlaggedDates(value[key]);
            }
        }
        return value;
    }

    return reviveFlaggedDates(r);
}

