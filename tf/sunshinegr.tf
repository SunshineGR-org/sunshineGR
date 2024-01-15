variable "image_id" {
  type    = string
  default = "gcr.io/datagovgr/sunshinegr:v0.0.38"
}

variable "diavgeia_username" {}
variable "diavgeia_password" {}
variable "datagovgr_billing_account" {}
variable "member_account" {}

resource "google_project" "datagovgr" {
  project_id      = "datagovgr"
  name            = "datagovgr"
  billing_account = variable.datagovgr_billing_account
}

resource "google_cloud_tasks_queue" "date" {
  name     = "date"
  location = "europe-west1"

  rate_limits {
    max_concurrent_dispatches = 5
  }

  retry_config {
    max_attempts  = 10
    max_backoff   = "600s"
    min_backoff   = "2s"
    max_doublings = 16
  }
}

resource "google_cloud_tasks_queue" "decision-batches" {
  name     = "decision-batches"
  location = "europe-west1"

  rate_limits {
    max_dispatches_per_second = 5
    max_concurrent_dispatches = 5
  }

  retry_config {
    max_attempts  = 10
    max_backoff   = "600s"
    min_backoff   = "2s"
    max_doublings = 16
  }
}

resource "google_cloud_tasks_queue" "decisions" {
  name     = "decisions"
  location = "europe-west1"

  rate_limits {
    max_dispatches_per_second = 40
    max_concurrent_dispatches = 100
  }

  retry_config {
    max_attempts  = 10
    max_backoff   = "600s"
    min_backoff   = "2s"
    max_doublings = 16
  }
}

resource "google_cloud_tasks_queue" "decisions_01" {
  name     = "decisions-01"
  location = "europe-west1"
  project  = "datagovgr"

  rate_limits {
    max_dispatches_per_second = 40
    max_concurrent_dispatches = 100
  }

  retry_config {
    max_attempts  = 10
    max_backoff   = "600s"
    min_backoff   = "2s"
    max_doublings = 16
  }
}

resource "google_cloud_tasks_queue" "date_consolidation" {
  name     = "date-consolidation"
  location = "europe-west1"
  project  = "datagovgr"

  rate_limits {
    max_dispatches_per_second = 1
    max_concurrent_dispatches = 30
  }

  retry_config {
    max_attempts  = 10
    max_backoff   = "600s"
    min_backoff   = "2s"
    max_doublings = 16
  }
}

resource "google_cloud_run_service" "daily_list_retriever_srv" {
  name     = "daily-list-retriever-srv"
  location = "europe-west1"
  project  = "datagovgr"

  template {
    spec {
      containers {
        image = var.image_id
        env {
          name  = "DIAVGEIA_USERNAME"
          value = var.diavgeia_username
        }
        env {
          name  = "DIAVGEIA_PASSWORD"
          value = var.diavgeia_password
        }
        env {
          name  = "CONCURRENT_REQUESTS"
          value = 1
        }
        env {
          name  = "MAX_TASK_ATTEMPTS"
          value = 10
        }
      }
      container_concurrency = 1
    }
    metadata {
      annotations = {
        "run.googleapis.com/vpc-access-connector" = google_vpc_access_connector.default.name
        "run.googleapis.com/vpc-access-egress"    = "all-traffic"
        "autoscaling.knative.dev/maxScale"        = "1"
      }
    }
  }
  autogenerate_revision_name = true
}

resource "google_cloud_run_service_iam_binding" "daily_list_retriever_bind" {
  location = google_cloud_run_service.daily_list_retriever_srv.location
  service  = google_cloud_run_service.daily_list_retriever_srv.name
  project  = google_cloud_run_service.daily_list_retriever_srv.project
  role     = "roles/run.invoker"
  members = [ variable.member_account ]
}

resource "google_cloud_run_service" "decision_dispatcher_srv" {
  name     = "decision-dispatcher-srv"
  location = "europe-west1"
  project  = "datagovgr"


  template {
    spec {
      containers {
        image = var.image_id
        env {
          name  = "DIAVGEIA_USERNAME"
          value = var.diavgeia_username
        }
        env {
          name  = "DIAVGEIA_PASSWORD"
          value = var.diavgeia_password
        }
        env {
          name  = "CONCURRENT_REQUESTS"
          value = 5
        }
        env {
          name  = "MAX_TASK_ATTEMPTS"
          value = 10
        }
      }
      container_concurrency = 1
    }
    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale"        = "5"
        "run.googleapis.com/vpc-access-connector" = google_vpc_access_connector.default.name
        "run.googleapis.com/vpc-access-egress"    = "all-traffic"
      }
    }
  }
  autogenerate_revision_name = true
}

resource "google_cloud_run_service_iam_binding" "decision_dispatcher_bind" {
  location = google_cloud_run_service.decision_dispatcher_srv.location
  service  = google_cloud_run_service.decision_dispatcher_srv.name
  project  = google_cloud_run_service.decision_dispatcher_srv.project
  role     = "roles/run.invoker"
  members = [ variable.member_account ]
}

resource "google_cloud_run_service" "decision_retriever_srv" {
  name     = "decision-retriever-srv"
  location = "europe-west1"
  project  = "datagovgr"

  template {
    spec {
      containers {
        image = var.image_id
        env {
          name  = "DIAVGEIA_USERNAME"
          value = var.diavgeia_username
        }
        env {
          name  = "DIAVGEIA_PASSWORD"
          value = var.diavgeia_password
        }
        env {
          name  = "CONCURRENT_REQUESTS"
          value = 200
        }
        env {
          name  = "MAX_TASK_ATTEMPTS"
          value = 10
        }
        env {
          name = "DIAVGEIA_AUTHORIZATION"
          value = false
        }
      }
      container_concurrency = 200
    }
    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale"        = "10"
        "run.googleapis.com/vpc-access-connector" = google_vpc_access_connector.default.name
        "run.googleapis.com/vpc-access-egress"    = "all-traffic"
      }
    }
  }
  autogenerate_revision_name = true
}

resource "google_cloud_run_service_iam_binding" "decision_retriever_bind" {
  location = google_cloud_run_service.decision_retriever_srv.location
  service  = google_cloud_run_service.decision_retriever_srv.name
  project  = google_cloud_run_service.decision_retriever_srv.project
  role     = "roles/run.invoker"
  members = [ variable.member_account ]
}

resource "google_cloud_run_service" "daily_consolidation_srv" {
  name     = "daily-consolidation-srv"
  location = "europe-west1"
  project  = "datagovgr"

  template {
    spec {
      containers {
        image = var.image_id
        resources {
          limits = {
          # CPU usage limit
          # https://cloud.google.com/run/docs/configuring/cpu
          cpu = "1000m" # 1 vCPU

          # Memory usage limit (per container)
          # https://cloud.google.com/run/docs/configuring/memory-limits
          memory = "1024Mi"
          }
        }
      }
      container_concurrency = 1
      timeout_seconds = 3600
    }
    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale"        = "50"
        "run.googleapis.com/vpc-access-connector" = google_vpc_access_connector.default.name
        "run.googleapis.com/vpc-access-egress"    = "all-traffic"
      }
    }
  }
  autogenerate_revision_name = true
}

resource "google_cloud_run_service_iam_binding" "daily_consolidation_bind" {
  location = google_cloud_run_service.daily_consolidation_srv.location
  service  = google_cloud_run_service.daily_consolidation_srv.name
  project  = google_cloud_run_service.daily_consolidation_srv.project
  role     = "roles/run.invoker"
  members = [ variable.member_account ]
}

resource "google_storage_bucket" "diavgeia_decisions" {
  force_destroy               = false
  location                    = "EU"
  name                        = "diavgeia-decisions"
  project                     = "datagovgr"
  public_access_prevention    = "enforced"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  autoclass {
    enabled = true
  }
}

resource "google_storage_bucket" "diavgeia" {
  force_destroy               = false
  location                    = "EU"
  name                        = "diavgeia"
  project                     = "datagovgr"
  public_access_prevention    = "enforced"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  autoclass {
    enabled = true
  }
}

# Use VPC + Cloud NAT so we can control our external IP address
# and workaround Diavgeia's blocking. 
resource "google_compute_network" "sunshinegr_net" {
  project = "datagovgr"
  name    = "sunshinegr-vpc-network"
}

resource "google_compute_subnetwork" "sunshinegr_subnet_01" {
  project       = "datagovgr"
  name          = "sunshinegr-subnet-01"
  ip_cidr_range = "10.124.0.0/28"
  network       = google_compute_network.sunshinegr_net.id
  region        = "europe-west1"
}

resource "google_project_service" "vpc" {
  project            = "datagovgr"
  service            = "vpcaccess.googleapis.com"
  disable_on_destroy = false
}

resource "google_vpc_access_connector" "default" {
  project = "datagovgr"
  name    = "sunshinegr-conn"
  region  = "europe-west1"

  subnet {
    name = google_compute_subnetwork.sunshinegr_subnet_01.name
  }

  # Wait for VPC API enablement
  # before creating this resource
  depends_on = [
    google_project_service.vpc
  ]
}

resource "google_compute_router" "default" {
  project = "datagovgr"
  name    = "sunshinegr-router"
  network = google_compute_network.sunshinegr_net.name
  region  = google_compute_subnetwork.sunshinegr_subnet_01.region
}

resource "google_compute_address" "default" {
  project = "datagovgr"
  name    = "sunshinegr-subnet-01-addr"
  region  = google_compute_subnetwork.sunshinegr_subnet_01.region
}

resource "google_compute_router_nat" "default" {
  project = "datagovgr"
  name    = "sunshinegr-nat"
  router  = google_compute_router.default.name
  region  = google_compute_subnetwork.sunshinegr_subnet_01.region

  nat_ip_allocate_option = "MANUAL_ONLY"
  nat_ips                = [google_compute_address.default.self_link]

  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"
  subnetwork {
    name                    = google_compute_subnetwork.sunshinegr_subnet_01.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }
}
