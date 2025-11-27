import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { Site, SiteListResponse } from '../models/site.model';

@Injectable({
  providedIn: 'root'
})
export class SiteService {
  private sitesSubject = new BehaviorSubject<Site[]>([]);
  sites$ = this.sitesSubject.asObservable();

  constructor(private apiService: ApiService) { }

  registerSite(site: Site): Observable<Site> {
    return this.apiService.post<Site>('/sites', site);
  }

  getSites(page: number = 1, pageSize: number = 10, status?: string, vendorId?: string): Observable<SiteListResponse> {
    const params = { page, pageSize, status, vendorId };
    return this.apiService.get<SiteListResponse>('/sites', params);
  }

  getSiteById(id: string): Observable<Site> {
    return this.apiService.get<Site>(`/sites/${id}`);
  }

  updateSite(id: string, site: Site): Observable<Site> {
    return this.apiService.put<Site>(`/sites/${id}`, site);
  }

  updateSiteStatus(id: string, status: string, remark: string): Observable<any> {
    return this.apiService.patch<any>(`/sites/${id}/status`, { status, remark });
  }

  deleteSite(id: string): Observable<void> {
    return this.apiService.delete<void>(`/sites/${id}`);
  }

  bulkImportSites(file: File): Observable<any> {
    return this.apiService.uploadFile<any>('/sites/bulk-import', file);
  }

  addLocalSite(site: Site): void {
    const sites = this.sitesSubject.value;
    site.id = Math.random().toString(36).substr(2, 9);
    this.sitesSubject.next([...sites, site]);
  }
}
