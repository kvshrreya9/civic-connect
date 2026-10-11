from ..extensions import db, iso, utcnow

# Lifecycle: submitted -> reviewed -> assigned -> in_progress -> resolution_submitted -> verified -> closed
# plus reopened (citizen dispute) and rejected.
STATUSES = (
    "submitted", "reviewed", "assigned", "in_progress", "resolution_submitted",
    "verified", "closed", "reopened", "rejected",
)
OPEN_STATUSES = ("submitted", "reviewed", "assigned", "in_progress", "reopened")
RESOLVED_STATUSES = ("resolution_submitted", "verified", "closed")
RISK_LEVELS = ("low", "medium", "high", "critical")
RISK_RANK = {"low": 1, "medium": 2, "high": 3, "critical": 4}


class Complaint(db.Model):
    __tablename__ = "complaints"

    id = db.Column(db.Integer, primary_key=True)
    reference = db.Column(db.String(32), unique=True, nullable=False, index=True)
    title = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(40), nullable=False, index=True)
    severity = db.Column(db.String(20), nullable=False, default="medium")
    safety_risk = db.Column(db.Boolean, nullable=False, default=False)
    affected_count = db.Column(db.Integer, nullable=False, default=0)
    latitude = db.Column(db.Float, nullable=False, index=True)
    longitude = db.Column(db.Float, nullable=False, index=True)
    address = db.Column(db.String(500))
    status = db.Column(db.String(24), nullable=False, default="submitted", index=True)
    priority_score = db.Column(db.Integer, nullable=False, default=0, index=True)
    priority_breakdown = db.Column(db.JSON, nullable=False, default=dict)
    risk_level = db.Column(db.String(10), index=True)
    risk_breakdown = db.Column(db.JSON)
    related_count = db.Column(db.Integer, default=0, index=True)
    report_count = db.Column(db.Integer, default=1, index=True)
    citizen_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), index=True)
    office_id = db.Column(db.Integer, db.ForeignKey("offices.id"), index=True)
    ward_id = db.Column(db.Integer, db.ForeignKey("wards.id"), index=True)
    routing_status = db.Column(db.String(20), index=True)  # routed | unmapped | manual
    assigned_to_id = db.Column(db.Integer, db.ForeignKey("users.id"), index=True)
    sla_due_at = db.Column(db.DateTime, index=True)
    escalated = db.Column(db.Boolean, nullable=False, default=False, index=True)
    escalation_reason = db.Column(db.String(255))
    support_count = db.Column(db.Integer, nullable=False, default=0)
    possible_duplicate = db.Column(db.Boolean, nullable=False, default=False)
    duplicate_of_id = db.Column(db.Integer, db.ForeignKey("complaints.id"))
    client_request_id = db.Column(db.String(64), unique=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow, index=True)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)
    reviewed_at = db.Column(db.DateTime)
    resolved_at = db.Column(db.DateTime)  # when resolution evidence was submitted
    verified_at = db.Column(db.DateTime)
    closed_at = db.Column(db.DateTime)

    citizen = db.relationship("User", foreign_keys=[citizen_id])
    assigned_to = db.relationship("User", foreign_keys=[assigned_to_id])
    department = db.relationship("Department", back_populates="complaints")
    office = db.relationship("Office")
    ward = db.relationship("Ward")
    duplicate_of = db.relationship("Complaint", remote_side=[id])
    images = db.relationship(
        "ComplaintImage", back_populates="complaint", cascade="all, delete-orphan", order_by="ComplaintImage.id"
    )
    history = db.relationship(
        "ComplaintStatus", back_populates="complaint", cascade="all, delete-orphan", order_by="ComplaintStatus.id"
    )
    proofs = db.relationship(
        "ResolutionProof", back_populates="complaint", cascade="all, delete-orphan", order_by="ResolutionProof.id"
    )
    feedback = db.relationship(
        "ResolutionFeedback", back_populates="complaint", cascade="all, delete-orphan", order_by="ResolutionFeedback.id"
    )
    assignments = db.relationship(
        "DepartmentAssignment", back_populates="complaint", cascade="all, delete-orphan", order_by="DepartmentAssignment.id"
    )
    supports = db.relationship("ComplaintSupport", back_populates="complaint", cascade="all, delete-orphan")

    @property
    def is_open(self):
        return self.status in OPEN_STATUSES

    def report_images(self):
        return [image for image in self.images if image.kind == "report"]

    def resolution_images(self):
        return [image for image in self.images if image.kind == "resolution"]

    def verification_status(self):
        if self.status == "resolution_submitted":
            return "awaiting_verification"
        if self.status in ("verified", "closed") and self.verified_at:
            return "confirmed"
        if self.status == "closed":
            return "closed"
        if self.feedback and self.feedback[-1].verdict == "disputed":
            return "disputed"
        return "not_submitted" if not self.proofs else "pending"

    def resolution_summary(self):
        if not self.proofs:
            return None
        proof = self.proofs[-1]
        photos = proof.images or self.resolution_images()
        return {
            "proof_id": proof.id,
            "description": proof.notes,
            "completed_at": iso(proof.completed_at or proof.created_at),
            "submitted_by": {"name": proof.employee.name, "role": proof.employee.role} if proof.employee else None,
            "department": self.department.to_brief() if self.department else None,
            "office": self.office.to_brief() if self.office else None,
            "photos": [image.to_dict() for image in photos],
            "verification_status": self.verification_status(),
            "submission_count": len(self.proofs),
        }

    def summary(self):
        """Public, non-identifying summary (no photos, no reporter)."""
        from ..services.sla_service import sla_status

        return {
            "id": self.id,
            "reference": self.reference,
            "title": self.title,
            "category": self.category,
            "severity": self.severity,
            "status": self.status,
            "priority_score": self.priority_score,
            "risk_level": self.risk_level,
            "related_count": self.related_count or 0,
            "report_count": self.report_count or 1,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "address": self.address,
            "support_count": self.support_count,
            "escalated": self.escalated,
            "department": self.department.to_brief() if self.department else None,
            "office": self.office.to_brief() if self.office else None,
            "ward": self.ward.to_brief() if self.ward else None,
            "sla": sla_status(self),
            "created_at": iso(self.created_at),
        }

    def to_dict(self, viewer=None, detail=False):
        from ..services.sla_service import sla_status
        from ..utils.permissions import can_view_complaint

        full_access = can_view_complaint(viewer, self)
        is_staff = bool(viewer and viewer.is_staff and full_access)
        is_owner = bool(viewer and viewer.id == self.citizen_id)
        data = {
            "id": self.id,
            "reference": self.reference,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "severity": self.severity,
            "safety_risk": self.safety_risk,
            "affected_count": self.affected_count,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "address": self.address,
            "status": self.status,
            "priority_score": self.priority_score,
            "priority_breakdown": self.priority_breakdown or {},
            "risk_level": self.risk_level,
            "risk_breakdown": self.risk_breakdown or {},
            "related_count": self.related_count or 0,
            "report_count": self.report_count or 1,
            "department": self.department.to_brief() if self.department else None,
            "office": self.office.to_brief() if self.office else None,
            "ward": self.ward.to_brief() if self.ward else None,
            "routing_status": self.routing_status,
            "sla": sla_status(self),
            "escalated": self.escalated,
            "support_count": self.support_count,
            "possible_duplicate": self.possible_duplicate,
            "duplicate_of_id": self.duplicate_of_id,
            "is_mine": is_owner,
            "visibility": "full" if full_access else "public",
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
            "resolved_at": iso(self.resolved_at),
            "verified_at": iso(self.verified_at),
            "closed_at": iso(self.closed_at),
        }
        if not full_access:
            # Other citizens / the public: no photos, no reporter, no evidence, no history.
            data["reporter"] = {"name": "Verified citizen"}
            data["images"] = []
            data["resolution"] = None
            if detail:
                data["history"] = []
                data["supported_by_me"] = bool(viewer) and any(s.user_id == viewer.id for s in self.supports)
                data["can_verify"] = False
            return data

        data["reporter"] = (
            {"id": self.citizen_id, "name": self.citizen.name if self.citizen else "Citizen"}
            if (is_staff or is_owner) else {"name": "Verified citizen"}
        )
        data["escalation_reason"] = self.escalation_reason
        data["images"] = [image.to_dict() for image in self.report_images()]
        data["resolution"] = self.resolution_summary()
        data["verification_status"] = self.verification_status()
        if is_staff:
            data["assigned_to"] = self.assigned_to.to_brief() if self.assigned_to else None
        if detail:
            data["resolution_images"] = [image.to_dict() for image in self.resolution_images()]
            data["history"] = [entry.to_dict() for entry in self.history if is_staff or not entry.is_internal]
            data["supported_by_me"] = bool(viewer) and any(s.user_id == viewer.id for s in self.supports)
            data["can_verify"] = is_owner and self.status == "resolution_submitted"
        return data


class ComplaintSupport(db.Model):
    __tablename__ = "complaint_supports"
    __table_args__ = (db.UniqueConstraint("complaint_id", "user_id", name="uq_complaint_support_user"),)

    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    complaint = db.relationship("Complaint", back_populates="supports")
