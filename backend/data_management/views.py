from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from tasks.models import Task, Category, Tag
from tasks.serializers import TaskSerializer, CategorySerializer, TagSerializer
import json
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_data(request):
    """Export all user data including tasks, categories, and tags"""
    try:
        # Get all user tasks
        tasks = Task.objects.filter(user=request.user)
        task_data = TaskSerializer(tasks, many=True).data
        
        # Get categories used by this user's tasks
        # Since Category doesn't have a user field, we get categories from user's tasks
        category_ids = tasks.values_list('category', flat=True).distinct()
        categories = Category.objects.filter(id__in=category_ids)
        category_data = CategorySerializer(categories, many=True).data
        
        # Get tags used by this user's tasks
        # Since Tag doesn't have a user field, we get tags from user's tasks
        tag_ids = []
        for task in tasks:
            tag_ids.extend(task.tags.values_list('id', flat=True))
        tags = Tag.objects.filter(id__in=set(tag_ids))
        tag_data = TagSerializer(tags, many=True).data
        
        # Compile all data
        export_data = {
            'tasks': task_data,
            'categories': category_data,
            'tags': tag_data,
            'version': '1.0'
        }
        
        return Response(export_data)
    except Exception as e:
        logger.error(f"Error exporting data: {str(e)}")
        return Response(
            {'error': 'Failed to export data', 'detail': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_data(request):
    """Import user data including tasks, categories, and tags"""
    try:
        data = request.data
        
        # Process categories first to establish relationships
        if 'categories' in data and isinstance(data['categories'], list):
            for category_data in data['categories']:
                # Check if category already exists
                existing = Category.objects.filter(
                    name=category_data.get('name', '')
                ).first()
                
                if not existing:
                    # Create new category
                    # Remove any user field if present in the data
                    if 'user' in category_data:
                        del category_data['user']
                    serializer = CategorySerializer(data=category_data)
                    if serializer.is_valid():
                        serializer.save()
        
        # Process tags
        if 'tags' in data and isinstance(data['tags'], list):
            for tag_data in data['tags']:
                # Check if tag already exists
                existing = Tag.objects.filter(
                    name=tag_data.get('name', '')
                ).first()
                
                if not existing:
                    # Create new tag
                    # Remove any user field if present in the data
                    if 'user' in tag_data:
                        del tag_data['user']
                    serializer = TagSerializer(data=tag_data)
                    if serializer.is_valid():
                        serializer.save()
        
        # Process tasks
        imported_tasks = 0
        if 'tasks' in data and isinstance(data['tasks'], list):
            for task_data in data['tasks']:
                # Skip tasks that already exist with the same title
                existing = Task.objects.filter(
                    user=request.user,
                    title=task_data.get('title', '')
                ).first()
                
                if not existing:
                    # Prepare task data
                    task_data['user'] = request.user.id
                    
                    # Handle category by name
                    if 'category' in task_data and isinstance(task_data['category'], dict):
                        category_name = task_data['category'].get('name')
                        if category_name:
                            category = Category.objects.filter(
                                user=request.user, 
                                name=category_name
                            ).first()
                            if category:
                                task_data['category'] = category.id
                            else:
                                # Create category if it doesn't exist
                                new_category = Category.objects.create(
                                    user=request.user,
                                    name=category_name
                                )
                                task_data['category'] = new_category.id
                    
                    # Create the task
                    serializer = TaskSerializer(data=task_data)
                    if serializer.is_valid():
                        serializer.save()
                        imported_tasks += 1
                    else:
                        logger.warning(f"Invalid task data: {serializer.errors}")
        
        return Response({
            'message': 'Data imported successfully',
            'imported_tasks': imported_tasks
        })
    except Exception as e:
        logger.error(f"Error importing data: {str(e)}")
        return Response(
            {'error': 'Failed to import data', 'detail': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
