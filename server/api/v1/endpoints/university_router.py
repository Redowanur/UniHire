from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from core.deps import require_admin

from models.university_model import University
from services.catalog_service import _clean, _exact_ci
from pymongo.errors import DuplicateKeyError

router = APIRouter(prefix="/universities", tags=["University Management"])

@router.post(
    "",
    status_code=201,
    dependencies=[Depends(require_admin)],
)
async def create_university(
    university_name: str = Query(
        ..., 
        examples="Bangladesh University of Engineering and Technology"
    ),
):
    
    university_name = _clean(university_name)
    uni = await University.find_one(_exact_ci(university_name))
    
    if uni:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="University name is already registered",
        )
    
    university = University(
        name=university_name,
    )

    try:
        await university.insert()
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="University name is already registered",
        )

    return {"message": "University created successfully"}
    
@router.get(
    "",
    status_code=200,
)
async def get_universities():
    universities = await University.find_all().sort("name").to_list()
    return universities

@router.get(
    "/{university_id}",
    status_code=200,
)
async def get_university(university_id: PydanticObjectId):
    university = await University.find_one({"_id": university_id})
    if not university:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="University not found",
        )
    return university