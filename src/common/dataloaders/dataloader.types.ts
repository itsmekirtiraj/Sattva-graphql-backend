import DataLoader from 'dataloader';
import { User } from '../../modules/users/entities/user.entity';

export interface AppLoaders {
  userByIdLoader: DataLoader<string, User | null>;
}

export interface GraphQLContext {
  req: Request & { user?: unknown };
  loaders: AppLoaders;
}

