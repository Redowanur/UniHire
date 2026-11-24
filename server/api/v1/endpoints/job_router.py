import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import EmailStr

from core.deps import get_current_user
from enums.job_enums import JobType, WorkPlace
from enums.user_enums import UserType
from models.job_model import Job
from models.recruiter_model import Recruiter
from schemas.job_schema import JobCreateRequest, JobListProjection, JobUpdateRequest
from datetime import timedelta

from utils.helpers import parse_salary_range, time_ago, utcnow


router = APIRouter(prefix="/job", tags=["Job Management"])


@router.post(
    "",
    status_code=201,
)
async def create_job(job: JobCreateRequest, user: Recruiter = Depends(get_current_user)):
    # Check if the current user is a recruiter
    if user.user_type != UserType.RECRUITER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only recruiters can create jobs",
        )

    data = job.model_dump()
    if data.get("salary_min") is None and data.get("salary_max") is None:
        data["salary_min"], data["salary_max"] = parse_salary_range(job.salary)
    new_job = Job(
        **data,
        company_name=user.company_name,
        created_by=user.email
    )
    await new_job.insert()
    return {"message": "Job created successfully", "job_id": str(new_job.id)}


@router.delete(
    "/{job_id}",
    status_code=200,
)
async def delete_job(job_id: str, user: Recruiter = Depends(get_current_user)):
    # Check if the current user is a recruiter
    if user.user_type != UserType.RECRUITER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only recruiters can delete jobs",
        )

    job = await Job.get(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    # Check if the job was created by the current recruiter
    if job.created_by != user.email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete jobs you created",
        )

    await job.delete()
    return {"message": "Job deleted successfully"}


@router.patch(
    "/{job_id}",
    status_code=200,
)
async def update_job(job_id: str, job_data: JobUpdateRequest, user: Recruiter = Depends(get_current_user)):
    # Check if the current user is a recruiter
    if user.user_type != UserType.RECRUITER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only recruiters can update jobs",
        )

    job = await Job.get(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    # Check if the job was created by the current recruiter
    if job.created_by != user.email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update jobs you created",
        )

    # Update only the fields that were actually sent in the request
    for field, value in job_data.model_dump(exclude_unset=True).items():
        setattr(job, field, value)
    job.updated_at = utcnow()

    await job.save()
    return {"message": "Job updated successfully", "job_id": str(job.id)}

@router.get(
    "/all-jobs",
    status_code=200,
)
async def list_jobs(
    search: str | None = Query(None, description="Free-text search across title and company name"),
    company_name: str | None = Query(None, description="Filter by company name (partial, case-insensitive)"),
    job_type: JobType | None = Query(None, description="Filter by job type"),
    work_place: WorkPlace | None = Query(None, description="Filter by work place"),
    created_by: EmailStr | None = Query(None, description="Filter by recruiter email"),
    location: str | None = Query(None, description="Filter by location (partial, case-insensitive)"),
    category: str | None = Query(None, description="Filter by job category"),
    posted_within: int | None = Query(None, ge=1, le=365, description="Only jobs posted in the last N days"),
    salary_min: int | None = Query(None, ge=0, description="Minimum salary (jobs whose range reaches it)"),
    salary_max: int | None = Query(None, ge=0, description="Maximum salary (jobs whose range starts below it)"),
    sort: str = Query("newest", pattern="^(newest|oldest|salary_high|salary_low)$", description="Sort order"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Number of jobs per page"),
):
    # Build the filter conditions based on provided query params
    filters = []
    if search:
        pattern = re.escape(search)
        filters.append(
            {
                "$or": [
                    {"title": {"$regex": pattern, "$options": "i"}},
                    {"company_name": {"$regex": pattern, "$options": "i"}},
                ]
            }
        )
    if company_name:
        filters.append({"company_name": {"$regex": re.escape(company_name), "$options": "i"}})
    if job_type:
        filters.append(Job.job_type == job_type)
    if work_place:
        filters.append(Job.work_place == work_place)
    if created_by:
        filters.append(Job.created_by == created_by)
    if location:
        filters.append({"location": {"$regex": re.escape(location), "$options": "i"}})
    if category:
        filters.append({"category": {"$regex": f"^{re.escape(category)}$", "$options": "i"}})
    if posted_within:
        filters.append({"created_at": {"$gte": utcnow() - timedelta(days=posted_within)}})
    if salary_min is not None:
        filters.append({"salary_max": {"$gte": salary_min}})
    if salary_max is not None:
        filters.append({"salary_min": {"$lte": salary_max}})

    sort_field = {
        "newest": "-created_at",
        "oldest": "+created_at",
        "salary_high": "-salary_max",
        "salary_low": "+salary_min",
    }[sort]
    query = Job.find(*filters, projection_model=JobListProjection).sort(sort_field)
    total_jobs = await query.count()

    jobs = await query.skip((page - 1) * limit).limit(limit).to_list()
    total_pages = (total_jobs + limit - 1) // limit

    return {
        "total_jobs": total_jobs,
        "total_pages": total_pages,
        "current_page": page,
        "jobs": jobs,
    }
    
@router.get(
    "/suggestion",
    status_code=200,
)
async def get_search_suggestions(
    search_key: str = Query(..., min_length=1, max_length=100, description="Search key"),
):
    """Return the 10 latest jobs matching the query by title or company name."""
    pattern = re.escape(search_key)
    jobs = await Job.find(
        {
            "$or": [
                {"title": {"$regex": pattern, "$options": "i"}},
                {"company_name": {"$regex": pattern, "$options": "i"}},
            ]
        }
    ).sort("-created_at").limit(10).to_list()

    return {
        "suggestions": [
            {
                "id": str(job.id),
                "title": job.title,
                "company_name": job.company_name,
                "posted": time_ago(job.created_at),
            }
            for job in jobs
        ]
    }


@router.get(
    "/{job_id}",
    status_code=200,
)
async def get_job(job_id: str):
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    return job