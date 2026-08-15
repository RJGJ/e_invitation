from django.contrib import admin

from .models import Media


@admin.register(Media)
class MediaAdmin(admin.ModelAdmin):
    list_display = ["id", "image", "uploaded_by", "created_at", "deleted_at"]
    list_filter = ["deleted_at"]
    search_fields = ["uploaded_by__email"]

    def get_queryset(self, request):
        return Media.all_objects.all()
