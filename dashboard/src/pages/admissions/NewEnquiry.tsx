import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertEnquirySchema, type InsertEnquiry } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User,
  Users,
  GraduationCap,
  Heart,
  Home,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Breadcrumb } from "@/components/Breadcrumb";
import { FormStepper } from "@/components/FormStepper";

// State to City mappings
const STATE_CITY_MAP: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Hyderabad", "Vijayawada"],
  "Gujarat": ["Ahmedabad", "Vadodara", "Surat", "Rajkot"],
  "Karnataka": ["Bangalore", "Mysore", "Mangalore"],
  "Maharashtra": ["Mumbai", "Pune", "Thane", "Nagpur"],
  "Delhi": ["Delhi"],
  "Haryana": ["Gurgaon", "Faridabad"],
  "Uttar Pradesh": ["Lucknow", "Kanpur"],
  "Madhya Pradesh": ["Indore", "Bhopal"],
  "Rajasthan": ["Jaipur"],
  "Tamil Nadu": ["Chennai", "Coimbatore"],
  "Kerala": ["Kochi"],
  "West Bengal": ["Kolkata"],
  "Punjab": ["Chandigarh"],
  "Telangana": ["Hyderabad"],
};

// City to Pincodes mappings
const CITY_PINCODE_MAP: Record<string, string[]> = {
  "Ahmedabad": ["380001", "380002", "380006"],
  "Bangalore": ["560001", "560002", "560034"],
  "Bhopal": ["462001", "462003"],
  "Chandigarh": ["160001", "160002"],
  "Chennai": ["600001", "600002"],
  "Coimbatore": ["641001", "641002"],
  "Delhi": ["110001", "110002", "110007"],
  "Gurgaon": ["122001", "122002"],
  "Hyderabad": ["500001", "500002", "500003"],
  "Indore": ["452001", "452002"],
  "Jaipur": ["302001", "302002"],
  "Kanpur": ["208001", "208002"],
  "Kochi": ["682001", "682002"],
  "Kolkata": ["700001", "700002"],
  "Lucknow": ["226001", "226002"],
  "Mumbai": ["400001", "400002", "400003"],
  "Nagpur": ["440001", "440002"],
  "Noida": ["201301", "201302"],
  "Patna": ["800001", "800002"],
  "Pune": ["411001", "411002", "411003"],
  "Surat": ["395001", "395002"],
  "Thane": ["400601", "400602"],
  "Vadodara": ["390001", "390002"],
  "Visakhapatnam": ["530001", "530002"],
};

export default function NewEnquiry() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [siblingLookupId, setSiblingLookupId] = useState("");
  const [isLookingUpSibling, setIsLookingUpSibling] = useState(false);
  const [medicalOpen, setMedicalOpen] = useState(false);
  const [guardianOpen, setGuardianOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPincodes, setSelectedPincodes] = useState<string[]>([]);
  const [multiplePincodes, setMultiplePincodes] = useState(false);
  const totalSteps = 3;

  const handleNextStep = () => {
    if (currentStep < totalSteps && !isPending) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1 && !isPending) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const { mutate: createEnquiry, isPending } = useMutation({
    mutationFn: async (data: InsertEnquiry) => {
      const response = await apiRequest("POST", "/api/enquiries", data);
      return response.json();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create enquiry",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertEnquiry>({
    resolver: zodResolver(insertEnquirySchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      studentName: "",
      dateOfBirth: "",
      gender: "Male" as const,
      bloodGroup: "",
      fatherName: "",
      fatherPhone: "",
      fatherOccupation: "",
      motherName: "",
      motherPhone: "",
      motherOccupation: "",
      primaryContact: "father" as const,
      primaryContactNumber: "",
      hasSibling: false,
      siblingAdmissionNo: "",
      siblingName: "",
      siblingClass: "",
      residentialAddress: "",
      city: "",
      state: "",
      pincode: "",
      classAdmissionFor: "",
      admissionStatus: "Day Scholar" as const,
      board: "State Board" as const,
      medium: "English" as const,
      previousSchool: "",
      lastExamPassed: "",
      height: undefined,
      weight: undefined,
      hasMedicalCondition: false,
      medicalConditionDetails: "",
      doctorName: "",
      doctorPhone: "",
      localGuardianName: "",
      localGuardianAddress: "",
      localGuardianPhone: "",
      localGuardianRelation: "",
      declarationTruthful: false,
      declarationRules: false,
      declarationCancellation: false,
      studentSignature: "",
      parentSignature: "",
      followUpStatus: "Pending" as const,
      finalStatus: "Pending" as const,
      notes: "",
    },
  });

  // Watch for state changes and reset city/pincode when state changes
  const watchedState = form.watch("state");
  useEffect(() => {
    if (watchedState) {
      form.setValue("city", "");
      form.setValue("pincode", "");
      setMultiplePincodes(false);
      setSelectedPincodes([]);
    }
  }, [watchedState, form]);

  const hasSibling = form.watch("hasSibling");
  const admissionStatus = form.watch("admissionStatus");
  const hasMedicalCondition = form.watch("hasMedicalCondition");
  const primaryContact = form.watch("primaryContact");
  const fatherPhone = form.watch("fatherPhone");
  const motherPhone = form.watch("motherPhone");

  useEffect(() => {
    if (primaryContact === "father") {
      form.setValue("primaryContactNumber", fatherPhone || "");
    } else if (primaryContact === "mother") {
      form.setValue("primaryContactNumber", motherPhone || "");
    }
  }, [primaryContact, fatherPhone, motherPhone, form]);

  const lookupSibling = async () => {
    if (!siblingLookupId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a student ID",
        variant: "destructive",
      });
      return;
    }

    setIsLookingUpSibling(true);
    try {
      const response = await fetch(`/api/students/search?id=${siblingLookupId}`);
      if (!response.ok) {
        throw new Error("Student not found");
      }
      const data = await response.json();
      form.setValue("siblingName", data.name);
      form.setValue("siblingClass", data.class);
      form.setValue("siblingAdmissionNo", data.id);
      toast({
        title: "Success",
        description: "Sibling information loaded",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Student not found with this ID",
        variant: "destructive",
      });
    } finally {
      setIsLookingUpSibling(false);
    }
  };

  const onSubmit = (data: InsertEnquiry) => {
    createEnquiry(data, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
        toast({
          title: "Success",
          description: "Enquiry created successfully",
        });
        setCurrentStep(1);
        navigate("/admissions/enquiries");
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to create enquiry. Please check the form and try again.",
          variant: "destructive",
        });
      },
    });
  };

  const handleSaveAndAddAnother = () => {
    form.handleSubmit((data) => {
      createEnquiry(data, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
          toast({
            title: "Success",
            description: "Enquiry created successfully. Add another below.",
          });
          form.reset();
          setCurrentStep(1);
          window.scrollTo(0, 0);
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to create enquiry. Please check the form and try again.",
            variant: "destructive",
          });
        },
      });
    })();
  };

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb items={[
        { label: "Admissions", href: "/admissions/enquiries" },
        { label: "Enquiries", href: "/admissions/enquiries" },
        { label: "New Enquiry" }
      ]} />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">New Admission Enquiry</h1>
          <p className="text-muted-foreground">Quick form to record admission interest</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="shadow-lg border-primary/10">
          <div className="border-b px-6">
            <FormStepper
              steps={[
                { label: "Student Information", icon: User },
                { label: "Parent Details & Contact", icon: Users },
                { label: "Admission Preferences", icon: GraduationCap },
              ]}
              currentStep={currentStep}
              onStepClick={setCurrentStep}
            />
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-4 sm:p-6 lg:p-8">
            {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enquiry Date <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-enquiry-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="studentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student Full Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter student name" {...field} data-testid="input-student-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-dob" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-gender">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bloodGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">Blood Group</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-blood-group">
                            <SelectValue placeholder="Select blood group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            )}

            {currentStep === 2 && (
            <div className="space-y-6">
              <div className="p-4 space-y-4 rounded-lg border bg-card">
                <h3 className="font-semibold text-sm">Father's Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fatherName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Father's Full Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Enter father's name" {...field} data-testid="input-father-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fatherPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Father's Phone <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="10-digit mobile" {...field} data-testid="input-father-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="fatherOccupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">Father's Occupation</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter occupation" {...field} value={field.value ?? ""} data-testid="input-father-occupation" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="p-4 space-y-4 rounded-lg border bg-card">
                <h3 className="font-semibold text-sm">Mother's Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="motherName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mother's Full Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Enter mother's name" {...field} data-testid="input-mother-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="motherPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mother's Phone <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="10-digit mobile" {...field} data-testid="input-mother-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="motherOccupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">Mother's Occupation</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter occupation" {...field} value={field.value ?? ""} data-testid="input-mother-occupation" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="primaryContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Contact <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-primary-contact">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="father">Father</SelectItem>
                          <SelectItem value="mother">Mother</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primaryContactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Contact Number <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Auto-filled from above" 
                          {...field} 
                          data-testid="input-primary-contact" 
                          className="bg-blue-50/50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="p-4 space-y-4 rounded-lg border bg-card">
                <h3 className="font-semibold text-sm">Residential Address</h3>
                <FormField
                  control={form.control}
                  name="residentialAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complete Address <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter complete address" {...field} data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State <span className="text-destructive">*</span></FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("city", "");
                            form.setValue("pincode", "");
                            setMultiplePincodes(false);
                            setSelectedPincodes([]);
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-state">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Andhra Pradesh">Andhra Pradesh</SelectItem>
                            <SelectItem value="Arunachal Pradesh">Arunachal Pradesh</SelectItem>
                            <SelectItem value="Assam">Assam</SelectItem>
                            <SelectItem value="Bihar">Bihar</SelectItem>
                            <SelectItem value="Chhattisgarh">Chhattisgarh</SelectItem>
                            <SelectItem value="Goa">Goa</SelectItem>
                            <SelectItem value="Gujarat">Gujarat</SelectItem>
                            <SelectItem value="Haryana">Haryana</SelectItem>
                            <SelectItem value="Himachal Pradesh">Himachal Pradesh</SelectItem>
                            <SelectItem value="Jharkhand">Jharkhand</SelectItem>
                            <SelectItem value="Karnataka">Karnataka</SelectItem>
                            <SelectItem value="Kerala">Kerala</SelectItem>
                            <SelectItem value="Madhya Pradesh">Madhya Pradesh</SelectItem>
                            <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                            <SelectItem value="Manipur">Manipur</SelectItem>
                            <SelectItem value="Meghalaya">Meghalaya</SelectItem>
                            <SelectItem value="Mizoram">Mizoram</SelectItem>
                            <SelectItem value="Nagaland">Nagaland</SelectItem>
                            <SelectItem value="Odisha">Odisha</SelectItem>
                            <SelectItem value="Punjab">Punjab</SelectItem>
                            <SelectItem value="Rajasthan">Rajasthan</SelectItem>
                            <SelectItem value="Sikkim">Sikkim</SelectItem>
                            <SelectItem value="Tamil Nadu">Tamil Nadu</SelectItem>
                            <SelectItem value="Telangana">Telangana</SelectItem>
                            <SelectItem value="Tripura">Tripura</SelectItem>
                            <SelectItem value="Uttar Pradesh">Uttar Pradesh</SelectItem>
                            <SelectItem value="Uttarakhand">Uttarakhand</SelectItem>
                            <SelectItem value="West Bengal">West Bengal</SelectItem>
                            <SelectItem value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</SelectItem>
                            <SelectItem value="Chandigarh">Chandigarh</SelectItem>
                            <SelectItem value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</SelectItem>
                            <SelectItem value="Delhi">Delhi</SelectItem>
                            <SelectItem value="Jammu and Kashmir">Jammu and Kashmir</SelectItem>
                            <SelectItem value="Ladakh">Ladakh</SelectItem>
                            <SelectItem value="Lakshadweep">Lakshadweep</SelectItem>
                            <SelectItem value="Puducherry">Puducherry</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => {
                      const selectedState = form.watch("state");
                      const availableCities = selectedState && STATE_CITY_MAP[selectedState] ? STATE_CITY_MAP[selectedState] : [];
                      return (
                        <FormItem>
                          <FormLabel>City <span className="text-destructive">*</span></FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              const pincodes = CITY_PINCODE_MAP[value] || [];
                              if (pincodes.length > 1) {
                                setMultiplePincodes(true);
                                setSelectedPincodes(pincodes);
                                form.setValue("pincode", "");
                              } else if (pincodes.length === 1) {
                                setMultiplePincodes(false);
                                form.setValue("pincode", pincodes[0]);
                              }
                            }} 
                            value={field.value}
                            disabled={availableCities.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-city">
                                <SelectValue placeholder={availableCities.length === 0 ? "Select state first" : "Select city"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableCities.map((city) => (
                                <SelectItem key={city} value={city}>{city}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="pincode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pincode <span className="text-destructive">*</span></FormLabel>
                        {multiplePincodes ? (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-pincode">
                                <SelectValue placeholder="Select pincode" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {selectedPincodes.map((pincode) => (
                                <SelectItem key={pincode} value={pincode}>{pincode}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <FormControl>
                            <Input placeholder="Auto-filled" {...field} data-testid="input-pincode" readOnly className="bg-blue-50/50" />
                          </FormControl>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            )}

            {currentStep === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="classAdmissionFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Seeking Admission <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-class-admission">
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pre-KG">Pre-KG</SelectItem>
                          <SelectItem value="LKG">LKG</SelectItem>
                          <SelectItem value="UKG">UKG</SelectItem>
                          <SelectItem value="Class 1">Class 1</SelectItem>
                          <SelectItem value="Class 2">Class 2</SelectItem>
                          <SelectItem value="Class 3">Class 3</SelectItem>
                          <SelectItem value="Class 4">Class 4</SelectItem>
                          <SelectItem value="Class 5">Class 5</SelectItem>
                          <SelectItem value="Class 6">Class 6</SelectItem>
                          <SelectItem value="Class 7">Class 7</SelectItem>
                          <SelectItem value="Class 8">Class 8</SelectItem>
                          <SelectItem value="Class 9">Class 9</SelectItem>
                          <SelectItem value="Class 10">Class 10</SelectItem>
                          <SelectItem value="Class 11">Class 11</SelectItem>
                          <SelectItem value="Class 12">Class 12</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="admissionStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admission Type <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-admission-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Day Scholar">Day Scholar</SelectItem>
                          <SelectItem value="Hostel">Hostel</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="board"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Board Preference <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-board">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="State Board">State Board</SelectItem>
                          <SelectItem value="CBSE">CBSE</SelectItem>
                          <SelectItem value="ICSE">ICSE</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="medium"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medium of Instruction <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-medium">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Hindi">Hindi</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="previousSchool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">Previous School</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter school name" {...field} value={field.value ?? ""} data-testid="input-previous-school" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastExamPassed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">Last Exam Passed</FormLabel>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-last-exam">
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Nursery">Nursery</SelectItem>
                          <SelectItem value="LKG">LKG</SelectItem>
                          <SelectItem value="UKG">UKG</SelectItem>
                          <SelectItem value="Class 1">Class 1</SelectItem>
                          <SelectItem value="Class 2">Class 2</SelectItem>
                          <SelectItem value="Class 3">Class 3</SelectItem>
                          <SelectItem value="Class 4">Class 4</SelectItem>
                          <SelectItem value="Class 5">Class 5</SelectItem>
                          <SelectItem value="Class 6">Class 6</SelectItem>
                          <SelectItem value="Class 7">Class 7</SelectItem>
                          <SelectItem value="Class 8">Class 8</SelectItem>
                          <SelectItem value="Class 9">Class 9</SelectItem>
                          <SelectItem value="Class 10">Class 10</SelectItem>
                          <SelectItem value="Class 11">Class 11</SelectItem>
                          <SelectItem value="Class 12">Class 12</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-start space-x-3">
                <FormField
                  control={form.control}
                  name="hasSibling"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-has-sibling"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Student has a sibling already studying in this school</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {hasSibling && (
                <div className="p-4 space-y-4 rounded-lg border bg-card">
                  <h3 className="font-semibold text-sm">Sibling Information</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter Student ID"
                      value={siblingLookupId}
                      onChange={(e) => setSiblingLookupId(e.target.value)}
                      data-testid="input-sibling-lookup"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={lookupSibling}
                      disabled={isLookingUpSibling}
                      data-testid="button-sibling-lookup"
                    >
                      {isLookingUpSibling ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="siblingAdmissionNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admission No</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} readOnly className="bg-blue-50/50" data-testid="input-sibling-admission-no" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="siblingName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} readOnly className="bg-blue-50/50" data-testid="input-sibling-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="siblingClass"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Class</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} readOnly className="bg-blue-50/50" data-testid="input-sibling-class" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              <Collapsible open={medicalOpen} onOpenChange={setMedicalOpen}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
                    <Heart className="h-5 w-5" />
                    <span>Medical Information (Optional)</span>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" data-testid="button-toggle-medical">
                      {medicalOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <Separator />

                <CollapsibleContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">Height (cm)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 145" 
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              data-testid="input-height" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">Weight (kg)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 38" 
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              data-testid="input-weight" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex items-start space-x-3">
                    <FormField
                      control={form.control}
                      name="hasMedicalCondition"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-medical-condition"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-muted-foreground">Has any medical condition or special needs</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  {hasMedicalCondition && (
                    <>
                      <FormField
                        control={form.control}
                        name="medicalConditionDetails"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-muted-foreground">Medical Condition Details</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Please provide details" {...field} value={field.value ?? ""} data-testid="input-medical-details" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="doctorName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-muted-foreground">Doctor Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Doctor's name" {...field} value={field.value ?? ""} data-testid="input-doctor-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="doctorPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-muted-foreground">Doctor Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="10-digit mobile" {...field} value={field.value ?? ""} data-testid="input-doctor-phone" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}
                </CollapsibleContent>
            </Collapsible>

            <Collapsible open={guardianOpen} onOpenChange={setGuardianOpen} className="border-t pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
                    <Home className="h-5 w-5" />
                    <span>Local Guardian Details (Optional)</span>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" data-testid="button-toggle-guardian">
                      {guardianOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <Separator />

                <CollapsibleContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="localGuardianName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">Guardian Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter name" {...field} value={field.value ?? ""} data-testid="input-guardian-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="localGuardianRelation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">Relation</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Uncle" {...field} value={field.value ?? ""} data-testid="input-guardian-relation" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="localGuardianAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground">Guardian Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter complete address" {...field} value={field.value ?? ""} data-testid="input-guardian-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="localGuardianPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground">Guardian Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="10-digit mobile" {...field} value={field.value ?? ""} data-testid="input-guardian-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>

              <div className="border-t pt-6">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional information or remarks..."
                        {...field}
                        value={field.value ?? ""}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </div>
            </div>
            )}

            <div className="border-t pt-6 flex justify-between gap-4">
              <div className="flex gap-2">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                    disabled={isPending}
                    data-testid="button-prev"
                  >
                    Previous
                  </Button>
                )}
                {currentStep === 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/admissions/enquiries")}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {currentStep < 3 && (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    disabled={isPending}
                    data-testid="button-next"
                  >
                    Next
                  </Button>
                )}
                {currentStep === 3 && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleSaveAndAddAnother}
                      disabled={isPending}
                      data-testid="button-save-add-another"
                    >
                      Save & Add Another
                    </Button>
                    <Button type="submit" disabled={isPending} data-testid="button-submit">
                      {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Submit Enquiry
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>
        </Form>
        </Card>
      </div>
    </div>
  );
}
