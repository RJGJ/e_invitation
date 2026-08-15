from django.db import migrations


def create_admin_group_and_backfill(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    User = apps.get_model("users", "User")
    admin_group, _ = Group.objects.get_or_create(name="admin")
    for user in User.objects.filter(is_admin=True):
        user.groups.add(admin_group)


def reverse(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.filter(name="admin").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0001_initial"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]
    operations = [
        migrations.RunPython(create_admin_group_and_backfill, reverse),
    ]
