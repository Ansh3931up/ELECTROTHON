from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime

class UserFace:
    def __init__(self, mongodb_uri):
        self.client = MongoClient(mongodb_uri)
        self.db = self.client.EduSync
        self.users_collection = self.db.users

    def create_user(self, user_id):
        user = {
            'user_id': user_id,
            'face_images': [],
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        return self.collection.insert_one(user)

    def add_face_image(self, user_id, image_url, cloudinary_public_id):
        try:
            object_id = ObjectId(user_id)
            image_data = {
                'url': image_url,
                'cloudinary_public_id': cloudinary_public_id,
                'captured_at': datetime.now()
            }
            
            result = self.users_collection.update_one(
                {'_id': object_id},
                {
                    '$push': {'faceData.faceImages': image_data},
                    '$set': {
                        'faceData.lastUpdated': datetime.now(),
                        'faceData.verificationStatus': 'pending'
                    },
                    '$setOnInsert': {
                        'faceData.createdAt': datetime.now()
                    }
                },
                upsert=True
            )
            return result
        except Exception as e:
            print(f"Error adding face image: {e}")
            return None

    def get_user_images(self, user_id):
        user = self.users_collection.find_one({'_id': user_id})
        return user.get('faceData', {}).get('faceImages', []) if user else []

    def get_all_users(self):
        return list(self.users_collection.find(
            {'faceData.faceImages': {'$exists': True, '$ne': []}},
            {'faceData.faceImages': 1, '_id': 1, 'name': 1}
        ))

    def verify_user_exists(self, user_id):
        try:
            object_id = ObjectId(user_id)
            user = self.users_collection.find_one({'_id': object_id})
            return user is not None
        except Exception as e:
            print(f"Error verifying user: {e}")
            return False

    def get_user(self, user_id):
        """
        Get a single user by ID with their face images
        
        Args:
            user_id: ObjectId of the user
            
        Returns:
            dict: User document with face images
        """
        try:
            object_id = ObjectId(user_id)
            return self.users_collection.find_one({'_id': object_id})
        except Exception as e:
            print(f"Error getting user: {e}")
            return None