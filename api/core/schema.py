import strawberry

from events.schema import Mutation as EventsMutation
from events.schema import Query as EventsQuery
from media_items.schema import Mutation as MediaMutation
from media_items.schema import Query as MediaQuery


@strawberry.type
class Query(MediaQuery, EventsQuery):
    pass


@strawberry.type
class Mutation(MediaMutation, EventsMutation):
    pass


schema = strawberry.Schema(query=Query, mutation=Mutation)
