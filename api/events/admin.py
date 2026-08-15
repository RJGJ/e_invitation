from django.contrib import admin

from .models import Event


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ["title", "type", "author", "start_date", "deleted_at"]
    list_filter = ["type", "deleted_at"]
    search_fields = ["title", "author__email"]

    def get_queryset(self, request):
        return Event.all_objects.all()
