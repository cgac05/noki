import type { GeneradorId } from '@noki/application';
import { v7 } from 'uuid';
export class GeneradorIdUuidV7 implements GeneradorId {
  nuevo(): string { return v7(); }
}
