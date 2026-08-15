import uuid

from django.db import models

from core.managers import ActiveManager


class Media(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image = models.ImageField(upload_to="media/%Y/%m/")
    uploaded_by = models.ForeignKey(
        "users.User", on_delete=models.CASCADE, related_name="media_items"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = ActiveManager()
    all_objects = models.Manager()

    def __str__(self):
        return f"Media({self.id})"
