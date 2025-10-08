import 'reflect-metadata';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class MutationError {
  @Field(() => String)
  type!: string;

  @Field(() => String, { nullable: true })
  message?: string;
}

@ObjectType()
export class MutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => MutationError, { nullable: true })
  error?: MutationError;
}
