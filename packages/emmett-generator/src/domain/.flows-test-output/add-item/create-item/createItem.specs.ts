import { describe, it } from 'vitest';
import { DeciderSpecification } from '@event-driven-io/emmett';
import { decide } from './decide';
import { evolve } from './evolve';
import { initialState } from './state';



describe('Add item | Create item', () => {
const given = DeciderSpecification.for({
decide,
evolve,
initialState,
});


it('should emit ItemCreated for valid CreateItem', () => {
given([
])
.when({
type: 'CreateItem',
data: {
  itemId: 'item_123',
  description: 'A new item'
},
metadata: { now: new Date() }
})

    .then([
    {
        type: 'ItemCreated',
        data: {
  id: 'item_123',
  description: 'A new item',
  addedAt: new Date('2024-01-15T10:00:00.000Z')
}
      }
    ]);

});

});