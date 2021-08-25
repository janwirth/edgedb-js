// no runtime imports
import type {$expr_TypeIntersection, $pathify} from "../syntax/path";
import type {literal} from "../syntax/literal";
import type {typeutil} from "./util/typeutil";
import {Cardinality, ExpressionKind, TypeKind} from "./enums";

//////////////////
// BASE TYPES
//////////////////

export interface BaseType {
  __kind__: TypeKind;
  __name__: string;
}
export interface BaseTypeSet<
  T extends BaseType = BaseType,
  Card extends Cardinality = Cardinality
> {
  __element__: T;
  __cardinality__: Card;
}
export type BaseTypeTuple = typeutil.tupleOf<BaseType>;

export interface ScalarType<
  Name extends string = string,
  TsType extends any = any,
  TsConstType extends TsType = TsType
> {
  __kind__: TypeKind.scalar;
  __tstype__: TsType;
  __tsconsttype__: TsConstType;
  __name__: Name;
  <T extends TsType = TsType>(val: T): literal<ScalarType<Name, TsType, T>>;
}

export interface EnumType<
  Name extends string = string,
  TsType extends any = any,
  Vals extends any = any
> {
  __kind__: TypeKind.enum;
  __tstype__: TsType;
  __name__: Name;
  (val: TsType | Vals): literal<this>;
}

//////////////////
// OBJECT TYPES
//////////////////
// export type SomeObjectType = ObjectType;

export type SomeObjectType = {
  __kind__: TypeKind.object;
  __name__: string;
  __pointers__: ObjectTypeShape;
  __shape__: object | null;
  __polys__: Poly[];
};

export interface ObjectType<
  Name extends string = string,
  Pointers extends ObjectTypeShape = ObjectTypeShape,
  Shape extends object | null = any,
  Polys extends Poly[] = any[]
> {
  __kind__: TypeKind.object;
  __name__: Name;
  __pointers__: Pointers;
  __shape__: Shape;
  __polys__: Polys;
}

export type objectExprToSelectShape<T extends ObjectTypeExpression> =
  shapeToSelectShape<T["__element__"]["__pointers__"]>;

export type objectTypeToSelectShape<T extends SomeObjectType> =
  shapeToSelectShape<T["__pointers__"]>;

export type shapeToSelectShape<Shape extends ObjectTypeShape> = Partial<
  {
    [k in keyof Shape]: Shape[k] extends PropertyDesc
      ? boolean | TypeSet<Shape[k]["target"], Shape[k]["cardinality"]>
      : Shape[k] extends LinkDesc
      ?
          | true
          | TypeSet<Shape[k]["target"], Shape[k]["cardinality"]>
          | typeutil.flatten<
              shapeToSelectShape<Shape[k]["target"]["__pointers__"]> &
                linkDescShape<Shape[k]>
            >
      : any;
  }
>;

export type linkDescShape<Link extends LinkDesc> = addAtSigns<
  Link["properties"]
> extends ObjectTypeShape
  ? shapeToSelectShape<addAtSigns<Link["properties"]>>
  : never;

export type addAtSigns<T> = {[k in string & keyof T as `@${k}`]: T[k]};

export type shapeWithPolysToTs<
  Pointers extends ObjectTypeShape,
  Shape extends object | null,
  Polys extends Poly[]
> = simpleShapeToTs<Pointers, Shape> &
  unionToIntersection<
    Polys[number] extends infer P
      ? P extends Poly
        ? Partial<simpleShapeToTs<P["type"]["__pointers__"], P["params"]>>
        : never
      : never
  >;

export type simpleShapeToTs<
  Pointers extends ObjectTypeShape,
  Shape
> = typeutil.flatten<
  {
    [k in keyof Shape]: Shape[k] extends infer Param
      ? [k] extends [keyof Pointers]
        ? [Param] extends [true]
          ? shapeElementToTsType<Pointers[k]>
          : [Param] extends [false]
          ? never
          : [Param] extends [boolean]
          ? shapeElementToTsType<Pointers[k]> | undefined
          : Param extends TypeSet
          ? setToTsType<Param>
          : Param extends object
          ? Pointers[k]["target"] extends SomeObjectType
            ? simpleShapeToTs<Pointers[k]["target"]["__pointers__"], Param>
            : never
          : never
        : Param extends TypeSet
        ? setToTsType<Param>
        : never
      : never;
  }
>;

export type computeObjectShape<
  Pointers extends ObjectTypeShape,
  Shape extends object | null,
  Polys extends Poly[]
> = string extends keyof Pointers // checks if Shape is actually defined
  ? any
  : typeutil.assertEqual<Shape, object | null> extends true
  ? any
  : typeutil.assertEqual<Polys, Poly[]> extends true
  ? any
  : typeutil.assertEqual<Shape, null> extends true
  ? any
  : shapeWithPolysToTs<Pointers, Shape, Polys>;

type unionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type shapeElementToTsTypeSimple<El extends PropertyDesc | LinkDesc> =
  El extends PropertyDesc
    ? propToTsType<El>
    : El extends LinkDesc<any, any, any, any>
    ? {id: string}
    : never;

export type Poly<
  Type extends SomeObjectType = SomeObjectType,
  Params extends any = any
> = {
  type: Type;
  params: Params;
};
export type AnyPoly = {type: any; params: any};

////////////////////
// SETS AND EXPRESSIONS
////////////////////

export interface TypeSet<
  T extends MaterialType = MaterialType,
  Card extends Cardinality = Cardinality
> {
  __element__: T;
  __cardinality__: Card;
}

// utlity function for creating set
export function $toSet<Root extends MaterialType, Card extends Cardinality>(
  root: Root,
  card: Card
): TypeSet<Root, Card> {
  return {
    __element__: root,
    __cardinality__: card,
  };
}

export type BaseExpression<Set extends TypeSet = TypeSet> = {
  __element__: Set["__element__"];
  __cardinality__: Set["__cardinality__"];
  // __kind__: ExpressionKind;
  toEdgeQL(): string;
};

export type Expression<Set extends TypeSet = TypeSet> = Set &
  ExpressionMethods<{
    __element__: Set["__element__"];
    __cardinality__: Set["__cardinality__"];
  }> &
  $pathify<Set>;

// importing the actual alias from
// generated/modules/std didn't work.
// returned 'any' every time
export type $assertSingle<Type extends MaterialType, Args> = Expression<{
  __element__: Type;
  __cardinality__: Cardinality.One;
  __kind__: ExpressionKind.Function;
  __name__: "std::assert_single";
  __args__: Args;
  __namedargs__: {};
}>;

export interface ExpressionMethods<Set extends TypeSet> {
  __element__: Set["__element__"];
  __cardinality__: Set["__cardinality__"];
  toEdgeQL(): string;
  $is<T extends ObjectTypeExpression, This extends this = this>(
    ixn: T
  ): $expr_TypeIntersection<This, T>;
  $assertSingle<This extends this = this>(): $assertSingle<
    Set["__element__"],
    [This]
  >;
}

export type MaterialTypeSet<
  T extends MaterialType = MaterialType,
  Card extends Cardinality = Cardinality
> = TypeSet<T, Card>;

export type ObjectTypeSet<
  T extends SomeObjectType = SomeObjectType,
  Card extends Cardinality = Cardinality
> = TypeSet<T, Card>;

export type ObjectTypeExpression<Set extends ObjectTypeSet = ObjectTypeSet> =
  Expression<Set>;

export type PrimitiveType =
  | ScalarType
  | EnumType
  | TupleType
  | NamedTupleType
  | ArrayType;

export type PrimitiveTypeSet<
  T extends PrimitiveType = PrimitiveType,
  Card extends Cardinality = Cardinality
> = TypeSet<T, Card>;

export type PrimitiveExpression<
  Set extends PrimitiveTypeSet = PrimitiveTypeSet
> = Expression<Set>;

/////////////////////////
/// COLLECTION TYPES
/////////////////////////
export type ArrayType<
  Element extends NonArrayMaterialType = NonArrayMaterialType,
  Name extends string = `array<${Element["__name__"]}>`
> = {
  __name__: Name;
  __kind__: TypeKind.array;
  __element__: Element;
};

export function ArrayType<Element extends NonArrayMaterialType>(
  element: Element
): ArrayType<Element> {
  return {
    __kind__: TypeKind.array,
    __name__: `array<${element.__name__}>`,
    __element__: element,
  } as any;
}

type ArrayTypeToTsType<Type extends ArrayType> = Array<
  BaseTypeToTsType<Type["__element__"]>
>;

export type MaterialTypeTuple = [MaterialType, ...MaterialType[]] | [];

export type TupleType<Items extends BaseTypeTuple = BaseTypeTuple> = {
  __name__: string;
  __kind__: TypeKind.tuple;
  __items__: Items;
};
export function TupleType<Items extends typeutil.tupleOf<BaseType>>(
  items: Items
): TupleType<Items> {
  const name = `tuple<${items.map((item) => item.__name__).join(", ")}>`;
  return {
    __kind__: TypeKind.tuple,
    __name__: name,
    __items__: items,
  } as any;
}

type TupleItemsToTsType<Items extends BaseTypeTuple> = {
  [k in keyof Items]: Items[k] extends BaseType
    ? BaseTypeToTsType<Items[k]>
    : never;
};

export type NamedTupleShape = {[k: string]: MaterialType};
export type NamedTupleType<Shape extends NamedTupleShape = NamedTupleShape> = {
  __name__: string;
  __kind__: TypeKind.namedtuple;
  __shape__: Shape;
};
export function NamedTupleType<Shape extends NamedTupleShape>(
  shape: Shape
): NamedTupleType<Shape> {
  const name = `tuple<${Object.entries(shape)
    .map(([key, val]) => `${key}: ${val.__name__}`)
    .join(", ")}>`;
  return {
    __kind__: TypeKind.namedtuple,
    __name__: name,
    __shape__: shape,
  } as any;
}

type NamedTupleTypeToTsType<Type extends NamedTupleType> = {
  [k in keyof Type["__shape__"]]: BaseTypeToTsType<Type["__shape__"][k]>;
};

/////////////////////////
/// OBJECT TYPES
/////////////////////////

type PropertyTypes =
  | ScalarType
  | EnumType
  | ArrayType
  | TupleType
  | NamedTupleType;
export interface PropertyDesc<
  Type extends PropertyTypes = PropertyTypes,
  Card extends Cardinality = Cardinality,
  Exclusive extends boolean = boolean,
  Writable extends boolean = boolean
> {
  __kind__: "property";
  target: Type;
  cardinality: Card;
  exclusive: Exclusive;
  writable: Writable;
}

export type PropertyShape = {
  [k: string]: PropertyDesc;
};

export interface LinkDesc<
  Type extends SomeObjectType = SomeObjectType,
  Card extends Cardinality = Cardinality,
  LinkProps extends PropertyShape = PropertyShape,
  Exclusive extends boolean = boolean,
  Writable extends boolean = boolean
> {
  __kind__: "link";
  target: Type;
  cardinality: Card;
  properties: LinkProps;
  exclusive: Exclusive;
  writable: Writable;
}

export type ObjectTypeShape = {
  [k: string]: PropertyDesc | LinkDesc;
};

/////////////////////
/// TSTYPE HELPERS
/////////////////////

export type BaseTypeToTsType<Type extends BaseType> = Type extends ScalarType
  ? Type["__tsconsttype__"]
  : Type extends EnumType
  ? Type["__tstype__"]
  : Type extends ArrayType
  ? ArrayTypeToTsType<Type>
  : Type extends TupleType
  ? TupleItemsToTsType<Type["__items__"]>
  : Type extends NamedTupleType
  ? NamedTupleTypeToTsType<Type>
  : Type extends ObjectType
  ? computeObjectShape<
      Type["__pointers__"],
      Type["__shape__"],
      Type["__polys__"]
    >
  : never;

export type setToTsType<Set extends TypeSet> =
  Set["__cardinality__"] extends Cardinality.Empty
    ? null
    : Set["__cardinality__"] extends Cardinality.One
    ? BaseTypeToTsType<Set["__element__"]>
    : Set["__cardinality__"] extends Cardinality.AtLeastOne
    ? [
        BaseTypeToTsType<Set["__element__"]>,
        ...BaseTypeToTsType<Set["__element__"]>[]
      ]
    : Set["__cardinality__"] extends Cardinality.AtMostOne
    ? BaseTypeToTsType<Set["__element__"]> | null
    : Set["__cardinality__"] extends Cardinality.Many
    ? BaseTypeToTsType<Set["__element__"]>[]
    : Set["__cardinality__"] extends Cardinality
    ? unknown
    : never;

export type propToTsType<Prop extends PropertyDesc> =
  Prop extends PropertyDesc<infer Type, infer Card>
    ? setToTsType<TypeSet<Type, Card>>
    : never;

export type linkToTsType<Link extends LinkDesc<any, any, any, any>> =
  Link extends LinkDesc<infer Type, infer Card, any>
    ? setToTsType<TypeSet<Type, Card>>
    : never;

export type assignableCardinality<C extends Cardinality> =
  C extends Cardinality.Empty
    ? Cardinality.Empty
    : C extends Cardinality.AtMostOne
    ? Cardinality.One | Cardinality.AtMostOne | Cardinality.Empty
    : C extends Cardinality.One
    ? Cardinality.One | Cardinality.AtMostOne | Cardinality.Empty
    : C extends Cardinality.AtLeastOne
    ? Cardinality.One | Cardinality.AtLeastOne | Cardinality.Many
    : C extends Cardinality.Many
    ? Cardinality
    : never;

export type shapeElementToExpression<Element extends PropertyDesc | LinkDesc> =
  Element extends PropertyDesc
    ? TypeSet<Element["target"], assignableCardinality<Element["cardinality"]>>
    : Element extends LinkDesc
    ? TypeSet<
        ObjectType<
          // anonymize the link target
          // generated object types are too limiting
          // they have no shape or polys
          Element["target"]["__name__"],
          Element["target"]["__pointers__"]
        >,
        assignableCardinality<Element["cardinality"]>
      >
    : never;

export type shapeElementToTsType<El extends PropertyDesc | LinkDesc> =
  El extends PropertyDesc
    ? propToTsType<El>
    : El extends LinkDesc<any, any, any, any>
    ? linkToTsType<El>
    : never;

export type shapeToTsType<T extends ObjectTypeShape> = string extends keyof T
  ? any
  : typeutil.flatten<
      {
        [k in keyof T]: shapeElementToTsType<T[k]>;
      }
    >;

///////////////////////////////////
// DISCRIMINATED UNION OF ALL MATERIAL TYPES
///////////////////////////////////

export type MaterialType =
  | ScalarType
  | EnumType
  | ObjectType
  | TupleType
  | NamedTupleType
  | ArrayType;

export type NonArrayMaterialType =
  | ScalarType
  | EnumType
  | ObjectType
  | TupleType
  | NamedTupleType;

export type AnyTupleType = TupleType | NamedTupleType;

export type ParamType = ScalarType | ArrayType<ScalarType>;
