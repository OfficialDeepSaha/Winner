"""
Authentication views for Smart Todo Backend
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Return the authenticated user's profile data"""
    user = request.user
    
    # Include all necessary user data
    data = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_staff': user.is_staff,
    }
    
    return Response(data, status=status.HTTP_200_OK)
